# FSI Real Time Payments Demo


## Manual Installation

### Local Environment

Clone or download this git repository to a local working space. The below instructions assume git, maven and oc are installed. Commands below are run against a local clone or download of this git repository.

###  Project Setup

Logged in as a user logged in to K8 with cluster-admin permissions, create a new namespace for the demo project:
```
kubectl create ns rtp-demo
kubectl label namespace rtp-demo istio-injection=enabled
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

$ kubectl exec -it mysql-56-rhel7-0 -n rtp-demo  -- bash
bash-4.2$ 
bash-4.2$ mysql --host localhost -P 3306 --protocol tcp -u root -D rtpdb -pdbpass
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

Build the maven projects in the following order using 'mvn clean package':
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

Check that you are in the payments-demo/rtp-helm/sample folder:
```
kubectl apply -f ./sample-rtp-k8-app.yaml -n rtp-demo

```


## Payments and Accounts API

This project implements the below Open Banking Payments and Accounts API methods. The official documentation can be found here:

- https://openbankinguk.github.io/read-write-api-site3/v3.1.6/resources-and-data-models/aisp/Accounts.html
- https://openbankinguk.github.io/read-write-api-site3/v3.1.6/resources-and-data-models/aisp/Balances.html
- https://openbankinguk.github.io/read-write-api-site3/v3.1.6/resources-and-data-models/aisp/Transactions.html
- https://openbankinguk.github.io/read-write-api-site3/v3.1.6/resources-and-data-models/pisp/domestic-payments.html
- https://github.com/OpenBankingUK/read-write-api-specs

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
