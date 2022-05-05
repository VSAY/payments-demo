#!/bin/sh


docket login - U ajaynaidu -P Sidgs123+

for FILE in `pwd`/**/target/docker-compose.yaml
do
   echo $FILE

   docker-compose -f $FILE build

   docker-compose -f $FILE push

done
