helm install my-release mysql \
  --set auth.rootPassword=dbpass,auth.database=rtpdb,fullnameOverride=mysql-56-rhel7 \
     -n rtp-demo  --create-namespace