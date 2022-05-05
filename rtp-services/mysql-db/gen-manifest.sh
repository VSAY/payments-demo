helm template my-release \
  --set auth.rootPassword=dbpass,auth.database=rtpdb,fullnameOverride=mysql-56-rhel7 \
    bitnami/mysql -n rtp-demo > mysql-db.yaml