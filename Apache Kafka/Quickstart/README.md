Quickstart
==========

Following along [this](https://kafka.apache.org/quickstart) thing.

After that will be [this](http://www.shayne.me/blog/2015/2015-06-16-everything-about-kafka-part-1/).



Docker Image
------------

First, I wanted to try puting it in Docker just so I don't have to finagle installs myself and because Docker.

I used this as a Dockerfile so I didn't have to keep specifying `-v`.  Come to thing of it, though, that's not really much to do.  So, maybe I don't need to do that.

```dockerfile
FROM wurstmeister/kafka

VOLUME ["$(pwd)/data:/data"]

CMD ["bash"]
```

Oh well.

As it turns out you can'd to `$(pwd)` in docker's VOLUME directive.  Alas.  Commands it is!



Commands!
---------

So instead of that, we'll just do commands.

In the main window I'll be faffing about in, I'll just run bash.  This sets up the shell I'll be tooling about with.

> Note: I started with no name, but just to keep the commands similar I'm keeping the name `gigantic_thompson` that docker first created.

```
$ docker run -itd -v "$(pwd)/data:/data" --name gigantic_thompson wurstmeister/kafka /bin/bash
d0818a967202603e6d104f370bdca5358bd2114ac99f53474faff4491f613176
$ docker ps
CONTAINER ID        IMAGE                COMMAND             CREATED             STATUS              PORTS               NAMES
d0818a967202        wurstmeister/kafka   "/bin/bash"         6 seconds ago       Up 5 seconds                            gigantic_thompson
$ docker attach gigantic_thompson
bash-4.3# _
```

The Kafka tarball was extracted to `/opt/kafka_VERSION_STUFF` and symlinked to `/opt/kafka`, so I made an alias function so I wouldn't need to type out `/opt/kafka/bin` all the time.

> Actually this is pointless because `/opt/kafka/bin` is added to PATH.

```
# function ks() { local COMMAND=$1; shift; "$KBIN/$COMMAND" "$@"; }
# _
```


### Step 2 of Quickstart

In a second one, I'll run zookeeper.  Using `docker exec`, of course.

```
$ docker exec -it gigantic_thompson /opt/kafka/bin/zookeeper-server-start.sh /opt/kafka/config/zookeeper.properties
[2017-01-10 02:41:35,930] INFO Reading configuration from: /opt/kafka/config/zookeeper.properties (org.apache.zookeeper.server.quorum.QuorumPeerConfig)
...
```

In a third, I'll run the server.

```
$ docker exec -it gigantic_thompson /opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/server.properties
[2017-01-10 02:52:28,022] INFO KafkaConfig values: 
	advertised.host.name = null
	advertised.listeners = null
	advertised.port = null
	authorizer.class.name = 
	auto.create.topics.enable = true
	auto.leader.rebalance.enable = true
...
```


### Step 3: Creating a Topic

First, we need to create a topic.  Should create a topic then show it in the list.

```
# ks kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic test
Created topic "test".
# ks kafka-topics.sh --list --zookeeper localhost:2181
test
# _
```

Neat.


### Step 4: Send some messages

Kafka's all about logs.  Logs take messages.  Let's send some!

Things that send stuff to a Kafka server (well, to a broker which actually routes everything) are called Producers.

```
$ docker exec -it gigantic_thompson /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic test
This is a message!
This is another message!
Message for you!
(leaving shell open for now.)
```


### Step 5: Consume some messages

Kafka's all about actually using those logs.  Logs hold messages.  Let's get some!

Things that take stuff from a Kafka service are Consumers.

```
# docker exec -it gigantic_thompson /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic test --from-beginning
This is a message!
This is another message!
Message for you!
```

Since the Producer isn't yet closed, you can send more message!  And they'll appear!  Woo!

Excitement.


### Step 6: Multi-broker Cluster

It's time to get distributed...!

First, I went in and duplicated the server configs as directed, to change the `broker.id` values.

```
# pushd /opt/kafka/config/
# cp server.properties server-1.properties
# cp server.properties server-2.properties
# vi server-1.properties
# vi server-2.properties
```

... just pretend you can see the editing, which is updating the following values:

```
broker.id=1
listeners=PLAINTEXT://:9093
log.dir=/tmp/kafka-logs-1
```

```
broker.id=2
listeners=PLAINTEXT://:9094
log.dir=/tmp/kafka-logs-2
```

> Note: I'd shutdown my computer for bed last time.  This is another start.

This spams the console with the output of three servers... Hm.  I may want another shell.

Now, we're creating a topic with a replication factor of 3.  A new topic, with blackjack, and replication.  And hookers.

```
# kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 3 --partitions 1 --topic my-replicated-topic
```

Now let's take a look at which servers are replicating this topic.

```
# kafka-topics.sh --describe --zookeeper localhost:2181 --topic my-replicated-topic
Topic:my-replicated-topic	PartitionCount:1	ReplicationFactor:3	Configs:
	Topic: my-replicated-topic	Partition: 0	Leader: 1	Replicas: 1,0,2	Isr: 1,0,2
```

An explanation from the site:

> Here is an explanation of output. The first line gives a summary of all the partitions, each additional line gives information about one partition. Since we have only one partition for this topic there is only one line.

> - "leader" is the node responsible for all reads and writes for the given partition. Each node will be the leader for a randomly selected portion of the partitions.
> - "replicas" is the list of nodes that replicate the log for this partition regardless of whether they are the leader or even if they are currently alive.
> - "isr" is the set of "in-sync" replicas. This is the subset of the replicas list that is currently alive and caught-up to the leader.

We can of course look at the info for the first topic, too.

```
# kafka-topics.sh --describe --zookeeper localhost:2181 --topic test
Topic:test	PartitionCount:1	ReplicationFactor:1	Configs:
	Topic: test	Partition: 0	Leader: 0	Replicas: 0	Isr: 0
```

As expected, it has no replicas, it only exists at 0, and 0 is the leader by default.

#### Using the replicated topic

Okay, so let's actually use this shiny new topic.

Producer:

```
$ docker exec -it gigantic_thompson kafka-console-producer.sh --broker-list localhost:9092 --topic my-replicated-topic
```

Consumer:

```
$ kafka-console-consumer.sh --bootstrap-server localhost:9092 --from-beginning --topic my-replicated-topic
```

#### Fault Tolerance

We should be able to kill a server and a new leader will be chosen, and messages will still go through.  So, let's test that!

First, find the PID of the leader.  Ours is 1, so we'll grep for `server-1.properties`.

Okay, so I couldn't get the PID from `ps aux` for some reason, so I just `fg`ed the job and `^C`ed it.  This may have been too orderly a cleanup.

Still, when we look at the topic, we do see it's changed leaders.

```
# kafka-topics.sh --describe --zookeeper localhost:2181 --topic my-replicated-topic
Topic:my-replicated-topic	PartitionCount:1	ReplicationFactor:3	Configs:
	Topic: my-replicated-topic	Partition: 0	Leader: 0	Replicas: 1,0,2	Isr: 0,2
```

The leader is now 0!

```
^C
$ docker exec -it gigantic_thompson kafka-console-consumer.sh --bootstrap-server localhost:9092 --from-beginning --topic my-replicated-topic
```

So, let's restart the consumer and send another message through the producer.  And indeed, we get all the messages we put in earlier, and the new one!

Restarting the downed server and checking the topic description shows it's back in the ISR list!  But the leader remains 0, of course.

```
# kafka-topics.sh --describe --zookeeper localhost:2181 --topic my-replicated-topic
Topic:my-replicated-topic	PartitionCount:1	ReplicationFactor:3	Configs:
	Topic: my-replicated-topic	Partition: 0	Leader: 0	Replicas: 1,0,2	Isr: 0,2,1
```


### Step 7: Importing and Exporting Data with Kafka

Next, we're going to import some data from a file and export it to another one, while also looking at what a producer might put into a Kafka topic as its message as compared to the source data.

> Note: I'd restarted my computer at this point, so as prep I restarted the stopped container from last time using `docker start ...` and restarted zookeeper and the 3 kafka server instances.

First, create a file named `test.txt` and put some lines in it.  I did this:

```
fox
bear
badger
booger
```

That done, we start two connectors in standalone mode, which as explained by the article means "they run in a single, local, dedicated process."

```
# connect-standalone.sh \
	config/connect-standalone.properties \
	config/connect-file-source.properties \
	config/connect-file-sink.properties
```

These configure the standalone process itself, the file-source, and the file-sink, which is given the name `test.sink.txt`.

The standalone config uses the topic `connect-test` so we'll be peeking at that topic.  First, though, let's take a peek at the sink file.  Should have whatever we put into the `test.txt` file.

Indeed it does:

```
fox
bear
badger
booger
```

Now, let's actually peek at the raw items in the log, because the `connect-standalone.properties` file specifies some JSON schema-ery.

```
$ docker exec -it gigantic_thompson kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic connect-test --from-beginning
{"schema":{"type":"string","optional":false},"payload":"fox"}
{"schema":{"type":"string","optional":false},"payload":"bear"}
{"schema":{"type":"string","optional":false},"payload":"badger"}
{"schema":{"type":"string","optional":false},"payload":"booger"}
```

Interesting.

Now, if we add some things to `test.txt`, they should show up both in the console-consumer's output and in `test.sink.txt`.

Added this to it:

```
hyena
hyena
yay
hyena
```

And indeed:

```
$ docker exec -it gigantic_thompson kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic connect-test --from-beginning
...
{"schema":{"type":"string","optional":false},"payload":"hyena"}
{"schema":{"type":"string","optional":false},"payload":"hyena"}
{"schema":{"type":"string","optional":false},"payload":"yay"}
{"schema":{"type":"string","optional":false},"payload":"hyena"}
```

And in `test.sink.txt`:

```
fox
bear
badger
booger
hyena
hyena
yay
hyena
```

Nice.
