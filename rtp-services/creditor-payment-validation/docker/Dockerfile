FROM  @docker.base.image@

USER root

RUN groupadd -g 990 integrations && \
    useradd -r -u 990 -g integrations integrations

RUN mkdir /home/integrations
RUN mkdir /home/integrations/tmp

RUN chmod 777 /tmp

RUN chown -R integrations:integrations /home/integrations

USER integrations

WORKDIR /home/integrations


#VOLUME /tmp

COPY *.jar app.jar
EXPOSE 8080

# ENTRYPOINT ["./entrypoint.sh"]
CMD echo STARTING;java -Djava.io.tmpdir=/home/integrations/tmp -Xms512m $JAVA_OPTS -jar app.jar
#ENTRYPOINT ["tail", "-f", "/dev/null"]
