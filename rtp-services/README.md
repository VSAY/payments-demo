# FSI Real Time Payments Demo


## Manual Installation

### Local Environment

Clone or download this git repository to a local working space. The below instructions assume git, maven and oc are installed. Commands below are run against a local clone or download of this git repository.

###  Project Setup

Logged in as a user logged in to K8 with cluster-admin permissions, create a new namespace for the demo project:
```
kubectl create ns rtp-demo
```

### AMQ Streams

As a user with cluster admin permissions, install the AMQ Streams operator:
```

kubectl create -f 'https://strimzi.io/install/latest?namespace=rtp-demo' -n rtp-demo

```

Confirm that the AMQ Streams cluster operator is running:
```
kubectl get pods -n rtp-demo

```
Look For 

```
NAME                                        READY     STATUS    RESTARTS   AGE
strimzi-cluster-operator-55bcc5cf9d-5kbct   1/1       Running   0          61s
```

Install an ephemeral kafka cluster:
```

kubectl apply -f amq-streams/install/cluster/kafka-ephemeral.yaml -n rtp-demo


```
Look for 

```
kafka.kafka.strimzi.io/rtp-demo-cluster created
```

Confirm all AMQ Streams resources successfully created and running:
```

kubectl get all -n rtp-demo

```

### MySQL



Create the MySQl application:



```
kubectl apply -f mysql-db -n rtp-demo

```

Once the MySQL pod is running, log into the rtpdb database using the username/password as set up (dbuser/dbpass) and then apply the DDL located in payments-repository/src/main/resources/DDL and the DML located in payments-repository/src/main/resources/DML.

```
kubectl get pods -n rtp-demo | grep mysql

```

Validate the connection with the DB 


```

$ oc exec -it mysql-56-rhel7-1-zf5bk bash
bash-4.2$ 
bash-4.2$ mysql --host localhost -P 3306 --protocol tcp -u dbuser -D rtpdb -pdbpass
Warning: Using a password on the command line interface can be insecure.
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 22
Server version: 5.6.39 MySQL Community Server (GPL)

Copyright (c) 2000, 2018, Oracle and/or its affiliates. All rights reserved.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> use rtpdb;
Database changed
mysql> 
```

### Debtor Payment Services

Build the maven projects in the following order using 'mvn clean install':
- domain-model
- message-model
- payments-repository
- debtor-payments-service
- debtor-format-validation
- debtor-aml-check
- debtor-fraud-check
- debtor-core-banking
- debtor-send-payment
- mock-rtp-network
- debtor-payments-confirmation
- debtor-payments-lifecycle
- creditor-incoming-payments
- creditor-payment-validation
- creditor-aml-check
- creditor-payment-acknowledgement
- creditor-payments-confirmation

Check that you are in the rtp-demo project:
```
oc project rtp-demo
```

Import the Java 8 image:
```
oc import-image java8 --from=registry.access.redhat.com/redhat-openjdk-18/openjdk18-openshift -n openshift --confirm
```

cd into the debtor-payment-service maven project and create a new build:
```
cd debtor-payments-service
oc new-build java8 --name=debtor-payment-service --binary=true -n rtp-demo
oc start-build debtor-payment-service --from-file=target/debtor-payments-service-1.0.0.jar -n rtp-demo
```

After the OpenShift build is complete (check the build logs), create the application:
```
oc new-app debtor-payment-service -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e PRODUCER_TOPIC=debtor-incoming-payments \
-e SECURITY_PROTOCOL=PLAINTEXT \
-e SERIALIZER_CLASS=rtp.demo.domain.payment.serde.PaymentSerializer \
-e ACKS=1 \
-e DATABASE_URL="jdbc:mysql://mysql-56-rhel7:3306/rtpdb?autoReconnect=true" \
-e DATABASE_USER=dbuser \
-e DATABASE_PASS=dbpass
```

Expose the debtor payment service as a route:
```
$ oc expose svc/debtor-payment-service
route.route.openshift.io/debtor-payment-service exposed
```

The route can then be used to access the payments service:
```
$ oc get routes
NAME                     HOST/PORT                                                                            PATH      SERVICES                 PORT       TERMINATION   WILDCARD
debtor-payment-service   debtor-payment-service-rtp-demo.apps.cluster-nyc-26bf.nyc-26bf.example.opentlc.com             debtor-payment-service   8080-tcp                 None
```

Repeat the build and app creation for the rest of the deployable maven projects. Before running 'oc new-app' confirm that the image build has completed. These services do not need to be exposed as routes.
```
cd ../debtor-format-validation
oc new-build java8 --name=debtor-format-validation --binary=true -n rtp-demo
oc start-build debtor-format-validation --from-file=target/debtor-format-validation-1.0.0.jar -n rtp-demo

oc new-app debtor-format-validation -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=debtor-incoming-payments \
-e PRODUCER_TOPIC=debtor-format-validation-output \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=debtor-format-validation


cd ../debtor-aml-check
oc new-build java8 --name=debtor-aml-check --binary=true -n rtp-demo
oc start-build debtor-aml-check --from-file=target/debtor-aml-check-1.0.0.jar -n rtp-demo

oc new-app debtor-aml-check -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=debtor-format-validation-output \
-e PRODUCER_TOPIC=debtor-aml-check-output \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=debtor-aml-check


cd ../debtor-fraud-check
oc new-build java8 --name=debtor-fraud-check --binary=true -n rtp-demo
oc start-build debtor-fraud-check --from-file=target/debtor-fraud-check-1.0.0.jar -n rtp-demo

oc new-app debtor-fraud-check -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=debtor-format-validation-output \
-e PRODUCER_TOPIC=debtor-fraud-check-output \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=debtor-fraud-check


cd ../debtor-core-banking
oc new-build java8 --name=debtor-core-banking --binary=true -n rtp-demo
oc start-build debtor-core-banking --from-file=target/debtor-core-banking-1.0.0.jar -n rtp-demo

oc new-app debtor-core-banking -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=debtor-fraud-check-output \
-e CONSUMER_TOPIC_2=debtor-aml-check-output \
-e PRODUCER_TOPIC=debtor-core-banking-output \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=debtor-core-banking


cd ../debtor-send-payment
oc new-build java8 --name=debtor-send-payment --binary=true -n rtp-demo
oc start-build debtor-send-payment --from-file=target/debtor-send-payment-1.0.0.jar -n rtp-demo

oc new-app debtor-send-payment -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=debtor-core-banking-output \
-e PRODUCER_TOPIC=mock-rtp-incoming \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=debtor-send-payment


cd ../mock-rtp-network
oc new-build java8 --name=mock-rtp-network --binary=true -n rtp-demo
oc start-build mock-rtp-network --from-file=target/mock-rtp-network-1.0.0.jar -n rtp-demo

oc new-app mock-rtp-network -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=mock-rtp-incoming \
-e PRODUCER_TOPIC=mock-rtp-debtor-confirmation \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=mock-rtp-network


cd ../debtor-payments-confirmation
oc new-build java8 --name=debtor-payments-confirmation --binary=true -n rtp-demo
oc start-build debtor-payments-confirmation --from-file=target/debtor-payments-confirmation-1.0.0.jar -n rtp-demo

oc new-app debtor-payments-confirmation -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=mock-rtp-debtor-confirmation \
-e PRODUCER_TOPIC=debtor-payments-confirmation-output \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=debtor-payments-confirmation


cd ../debtor-payments-lifecycle
oc new-build java8 --name=debtor-payments-lifecycle --binary=true -n rtp-demo
oc start-build debtor-payments-lifecycle --from-file=target/debtor-payments-lifecycle-1.0.0.jar -n rtp-demo

oc new-app debtor-payments-lifecycle -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=debtor-payments-lifecycle \
-e DATABASE_URL="jdbc:mysql://mysql-56-rhel7:3306/rtpdb?autoReconnect=true" \
-e DATABASE_USER=dbuser \
-e DATABASE_PASS=dbpass


cd ../creditor-incoming-payments
oc new-build java8 --name=creditor-incoming-payments --binary=true -n rtp-demo
oc start-build creditor-incoming-payments --from-file=target/creditor-incoming-payments-1.0.0.jar -n rtp-demo

oc new-app creditor-incoming-payments -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=mock-rtp-creditor-incoming \
-e PRODUCER_TOPIC=creditor-incoming-payments \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=creditor-incoming-payments


cd ../creditor-payment-validation
oc new-build java8 --name=creditor-payment-validation --binary=true -n rtp-demo
oc start-build creditor-payment-validation --from-file=target/creditor-payment-validation-1.0.0.jar -n rtp-demo

oc new-app creditor-payment-validation -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=creditor-incoming-payments \
-e PRODUCER_TOPIC=creditor-payment-validation-output \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=creditor-payment-validation


cd ../creditor-aml-check
oc new-build java8 --name=creditor-aml-check --binary=true -n rtp-demo
oc start-build creditor-aml-check --from-file=target/creditor-aml-check-1.0.0.jar -n rtp-demo

oc new-app creditor-aml-check -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=creditor-payment-validation-output \
-e PRODUCER_TOPIC=creditor-aml-check-output \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=creditor-aml-check


cd ../creditor-payment-acknowledgement
oc new-build java8 --name=creditor-payment-acknowledgement --binary=true -n rtp-demo
oc start-build creditor-payment-acknowledgement --from-file=target/creditor-payment-acknowledgement-1.0.0.jar -n rtp-demo

oc new-app creditor-payment-acknowledgement -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=creditor-aml-check-output \
-e PRODUCER_TOPIC=mock-rtp-creditor-acknowledgement \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=creditor-payment-acknowledgement


cd ../creditor-payments-confirmation
oc new-build java8 --name=creditor-payments-confirmation --binary=true -n rtp-demo
oc start-build creditor-payments-confirmation --from-file=target/creditor-payments-confirmation-1.0.0.jar -n rtp-demo

oc new-app creditor-payments-confirmation -n rtp-demo \
-e BOOTSTRAP_SERVERS="rtp-demo-cluster-kafka-bootstrap:9092" \
-e CONSUMER_TOPIC=mock-rtp-creditor-confirmation \
-e PRODUCER_TOPIC=mock-rtp-incoming \
-e CONSUMER_MAX_POLL_RECORDS=500 \
-e CONSUMER_COUNT=1 \
-e CONSUMER_SEEK_TO=end \
-e CONSUMER_GROUP=creditor-payments-confirmation

```

## Automated (bash) Project Setup

Logged in to an OpenShift cluster as a cluster-admin user, run the setup bash script:
```
./setup.sh
```

After the script runs, check the deployed pods. If there are service pods experiencing errors, check the pod logs per the below:
```
$ oc logs -f rtp-creditor-payment-service-1-d4jcw 
Starting the Java application using /opt/jboss/container/java/run/run-java.sh ...
INFO exec  java -javaagent:/opt/jboss/container/jolokia/jolokia.jar=config=/opt/jboss/container/jolokia/etc/jolokia.properties -Xms192m -Xmx768m -XX:+UseParallelOldGC -XX:MinHeapFreeRatio=10 -XX:MaxHeapFreeRatio=20 -XX:GCTimeRatio=4 -XX:AdaptiveSizePolicyWeight=90 -XX:MaxMetaspaceSize=100m -XX:ParallelGCThreads=1 -Djava.util.concurrent.ForkJoinPool.common.parallelism=1 -XX:CICompilerCount=2 -XX:+ExitOnOutOfMemoryError -cp "." -jar /deployments/ROOT.jar  
Error: An unexpected error occurred while trying to open file /deployments/ROOT.jar
```

This is typically resolved by rerunning the build for the service:
```
$ cd <maven project directory>
$ oc start-build <build name> --from-file=target/ROOT.jar -n rtp-reference
```


## Payments and Accounts API

This project implements the below Open Banking Payments and Accounts API methods. The official documentation can be found here:

https://openbankinguk.github.io/read-write-api-site3/v3.1.6/resources-and-data-models/aisp/Accounts.html
https://openbankinguk.github.io/read-write-api-site3/v3.1.6/resources-and-data-models/aisp/Balances.html
https://openbankinguk.github.io/read-write-api-site3/v3.1.6/resources-and-data-models/aisp/Transactions.html
https://openbankinguk.github.io/read-write-api-site3/v3.1.6/resources-and-data-models/pisp/domestic-payments.html
https://github.com/OpenBankingUK/read-write-api-specs

### GET /accounts

Sample request:
GET ../accounts

Sample response:
```
{
    "Data": {
        "Account": [
            {
                "AccountId": "22289",
                "Status": "Enabled",
                "StatusUpdateDateTime": null,
                "Currency": "GBP",
                "AccountType": null,
                "AccountSubType": "CurrentAccount",
                "Description": null,
                "Nickname": "Bills",
                "OpeningDate": null,
                "MaturityDate": null,
                "Account": [
                    {
                        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
                        "Identification": "80200110203345",
                        "Name": "Mr Kevin",
                        "SecondaryIdentification": "00021"
                    }
                ],
                "Servicer": {
                    "SchemeName": null,
                    "Identification": null
                }
            },
            {
                "AccountId": "31820",
                "Status": "Enabled",
                "StatusUpdateDateTime": null,
                "Currency": "GBP",
                "AccountType": null,
                "AccountSubType": "CurrentAccount",
                "Description": null,
                "Nickname": "Household",
                "OpeningDate": null,
                "MaturityDate": null,
                "Account": [
                    {
                        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
                        "Identification": "80200110203348",
                        "Name": "ACME Inc",
                        "SecondaryIdentification": "0002"
                    }
                ],
                "Servicer": {
                    "SchemeName": null,
                    "Identification": null
                }
            }
        ]
    },
    "Links": null,
    "Meta": null
}
```

The query parameter 'AccountHolderId' has been added to the Open Banking specification in order to support account retrieval by user/account holder for demo purposes:

Sample request:
GET ../accounts?AccountHolderId=111111

Sample response:
```
{
    "Data": {
        "Account": [
            {
                "AccountId": "22289",
                "Status": "Enabled",
                "StatusUpdateDateTime": null,
                "Currency": "GBP",
                "AccountType": null,
                "AccountSubType": "CurrentAccount",
                "Description": null,
                "Nickname": "Bills",
                "OpeningDate": null,
                "MaturityDate": null,
                "Account": [
                    {
                        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
                        "Identification": "80200110203345",
                        "Name": "Mr Kevin",
                        "SecondaryIdentification": "00021"
                    }
                ],
                "Servicer": {
                    "SchemeName": null,
                    "Identification": null
                }
            },
            {
                "AccountId": "31820",
                "Status": "Enabled",
                "StatusUpdateDateTime": null,
                "Currency": "GBP",
                "AccountType": null,
                "AccountSubType": "CurrentAccount",
                "Description": null,
                "Nickname": "Household",
                "OpeningDate": null,
                "MaturityDate": null,
                "Account": [
                    {
                        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
                        "Identification": "80200110203348",
                        "Name": "ACME Inc",
                        "SecondaryIdentification": "0002"
                    }
                ],
                "Servicer": {
                    "SchemeName": null,
                    "Identification": null
                }
            }
        ]
    },
    "Links": null,
    "Meta": null
}
```

### GET /accounts/{AccountId}

Sample request:
GET ../accounts/22289

Sample response:
```
{
    "Data": {
        "Account": [
            {
                "AccountId": "22289",
                "Status": "Enabled",
                "StatusUpdateDateTime": null,
                "Currency": "GBP",
                "AccountType": null,
                "AccountSubType": "CurrentAccount",
                "Description": null,
                "Nickname": "Bills",
                "OpeningDate": null,
                "MaturityDate": null,
                "Account": [
                    {
                        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
                        "Identification": "80200110203345",
                        "Name": "Mr Kevin",
                        "SecondaryIdentification": "00021"
                    }
                ],
                "Servicer": {
                    "SchemeName": null,
                    "Identification": null
                }
            }
        ]
    },
    "Links": null,
    "Meta": null
}
```

### GET /accounts/{AccountId}/balances

Sample request:
GET ../accounts/22289/balances

Sample response:
```
{
    "Data": {
        "Balance": [
            {
                "AccountId": "22289",
                "CreditDebitIndicator": "Credit",
                "Type": "InterimAvailable",
                "DateTime": null,
                "Amount": {
                    "Amount": "29970.00",
                    "Currency": "GBP"
                },
                "CreditLine": null
            }
        ]
    },
    "Links": null,
    "Meta": null
}
```

###	GET /accounts/{AccountId}/transactions

Sample request:
GET ../accounts/22289/transactions

Sample response:
```
{
    "Data": {
        "Transaction": [
            {
                "AccountId": "22289",
                "TransactionId": "PAY20201011201457392",
                "TransactionReference": null,
                "StatementReference": [],
                "CreditDebitIndicator": "Debit",
                "Status": null,
                "TransactionMutability": null,
                "BookingDateTime": null,
                "ValueDateTime": null,
                "TransactionInformation": null,
                "AddressLine": null,
                "Amount": {
                    "Amount": "10.00",
                    "Currency": "GPB"
                },
                "ChargeAmount": {
                    "Amount": null,
                    "Currency": null
                },
                "CurrencyExchange": {
                    "SourceCurrency": null,
                    "TargetCurrency": null,
                    "UnitCurrency": null,
                    "ExchangeRate": null,
                    "ContractIdentification": null,
                    "QuotationDate": null,
                    "InstructedAmount": null
                },
                "BankTransactionCode": {
                    "Code": null,
                    "SubCode": null
                },
                "ProprietaryBankTransactionCode": {
                    "Code": null,
                    "Issuer": null
                },
                "Balance": {
                    "CreditDebitIndicator": null,
                    "Type": null,
                    "Amount": {
                        "Amount": null,
                        "Currency": null
                    }
                },
                "MerchantDetails": {
                    "MerchantName": null,
                    "MerchantCategoryCode": null
                },
                "CreditorAgent": {
                    "SchemeName": null,
                    "Identification": null,
                    "Name": null,
                    "PostalAddress": null
                },
                "CreditorAccount": {
                    "SchemeName": "UK.OBIE.SortCodeAccountNumber",
                    "Identification": "80200110203348",
                    "Name": "ACME Inc",
                    "SecondaryIdentification": "0002"
                },
                "DebtorAgent": {
                    "SchemeName": null,
                    "Identification": null,
                    "Name": null,
                    "PostalAddress": null
                },
                "DebtorAccount": {
                    "SchemeName": "UK.OBIE.SortCodeAccountNumber",
                    "Identification": "80200110203345",
                    "Name": "Mr Kevin",
                    "SecondaryIdentification": "00021"
                },
                "CardInstrument": {
                    "CardSchemeName": null,
                    "AuthorisationType": null,
                    "Name": null,
                    "Identification": null
                },
                "SupplementaryData": {}
          }
       ]
   },
   "Links": null,
   "Meta": null
}
```

### POST /domestic-payments

Sample request:
POST ../domestic-payments

Headers: 
Content-Type: application/json

Body:
```
{
  "Data": {
    "ConsentId": "58923",
    "Initiation": {
      "InstructionIdentification": "ACME412",
      "EndToEndIdentification": "FRESCO.21302.GFX.20",
      "InstructedAmount": {
        "Amount": "10.00",
        "Currency": "GPB"
      },
      "DebtorAccount": {
        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
        "Identification": "80200110203345",
        "Name": "Mr Kevin",
        "SecondaryIdentification": "00021"
      },
      "CreditorAccount": {
        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
        "Identification": "80200110203348",
        "Name": "ACME Inc",
        "SecondaryIdentification": "0002"
      },
      "RemittanceInformation": {
        "Reference": "FRESCO-101",
        "Unstructured": "Internal ops code 5120101"
      }
    }
  },
  "Risk": {
    "PaymentContextCode": "EcommerceGoods",
    "MerchantCategoryCode": "5967",
    "MerchantCustomerIdentification": "053598653254",
    "DeliveryAddress": {
      "AddressLine": [
        "Flat 7",
        "Acacia Lodge"
      ],
      "StreetName": "Acacia Avenue",
      "BuildingNumber": "27",
      "PostCode": "GU31 2ZZ",
      "TownName": "Sparsholt",
      "CountySubDivision": [
        "Wessex"
      ],
      "Country": "UK"
    }
  }
}
```

Sample response:
```
{
    "Data": {
        "DomesticPaymentId": "PAY20201012001929626",
        "ConsentId": "58923",
        "CreationDateTime": null,
        "Status": null,
        "StatusUpdateDateTime": null,
        "ExpectedExecutionDateTime": null,
        "ExpectedSettlementDateTime": null,
        "Refund": {
            "Account": {
                "SchemeName": null,
                "Identification": null,
                "Name": null,
                "SecondaryIdentification": null
            }
        },
        "Charges": null,
        "Initiation": {
            "InstructionIdentification": "ACME412",
            "EndToEndIdentification": "FRESCO.21302.GFX.20",
            "LocalInstrument": null,
            "InstructedAmount": {
                "Amount": "10.00",
                "Currency": "GPB"
            },
            "DebtorAccount": {
                "SchemeName": "UK.OBIE.SortCodeAccountNumber",
                "Identification": "80200110203345",
                "Name": "Mr Kevin",
                "SecondaryIdentification": "00021"
            },
            "CreditorAccount": {
                "SchemeName": "UK.OBIE.SortCodeAccountNumber",
                "Identification": "80200110203348",
                "Name": "ACME Inc",
                "SecondaryIdentification": "0002"
            },
            "CreditorPostalAddress": {
                "AddressType": null,
                "Department": null,
                "SubDepartment": null,
                "StreetName": null,
                "BuildingNumber": null,
                "PostCode": null,
                "TownName": null,
                "CountrySubDivision": null,
                "Country": null,
                "AddressLine": null
            },
            "RemittanceInformation": {
                "Unstructured": "Internal ops code 5120101",
                "Reference": "FRESCO-101"
            }
        },
        "MultiAuthorisation": {
            "Status": null,
            "NumberRequired": null,
            "NumberReceived": null,
            "LastUpdateDateTime": null,
            "ExpirationDateTime": null
        },
        "Debtor": {
            "Name": null
        }
    },
    "Links": {
        "Self": null,
        "First": null,
        "Prev": null,
        "Next": null,
        "Last": null
    },
    "Meta": {
        "TotalPages": null,
        "FirstAvailableDateTime": null,
        "LastAvailableDateTime": null
    }
}
```
