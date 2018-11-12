Getting Started with Dgraph
===========================

I'd been wanting to play with graph databases for a long time, but hadn't worked up the wherewithall to actually dig in.  I almost started on OrientDB awhile back, but ultimately didn't pursue that one after finding out (at the time) what a shit show it was.  Looking again at things, Dgraph came up as a nice "little" one that was built with scalability in mind.  It was also written in Go, which is neat, but not ultimately a big factor.  It also has a GraphQL-esque query language called, creatively, GraphQL+-.  I suppose DGraphQL was too onbnoxious.

If I find Dgraph's relatively simple model too constraining for whatever reason, there's always ArangoDB.

Anyway, Dgraph doesn't seem to be a shit show, and also doesn't seem to be paused like Cayley is, so I'll just play with this one for now.

I'm going to start of course with their fine [tutorial](https://docs.dgraph.io/get-started/), documenting my journey here and, most importantly, taking notes on new parts.



## Setup: Docker Containers

Ah, the ultimate in laziness.  I'm ambivalent about Docker as a specific implementation, but as a service to spin up containers that run services instead of installing all that on my home box, mmmmm.  So, I copied down the `docker-compose.yml` from their site and spun up the containers.  They even have their own visual interface with `dgraph-ratel`.  Nice.



## First Queries

Well, okay, mutations, indices, and queries.  The DB starts pristine, unlike the DBs at some of my jobs... Also like those same DBs, we start with some movies.  In this case, we start with just some Star Wars stuff because, well, Star Wars.

Obviously, this is a Mutation to start.  I'm keeping the curl commands just to make clear what the whole request is.  I also changed `python -m json.tool` to `jq` because I always have that installed.

```sh
curl localhost:8080/mutate -H "X-Dgraph-CommitNow: true" -XPOST -d $'
{
  set {
    _:luke <name> "Luke Skywalker" .
    _:leia <name> "Princess Leia" .
    _:han <name> "Han Solo" .
    _:lucas <name> "George Lucas" .
    _:irvin <name> "Irvin Kernshner" .
    _:richard <name> "Richard Marquand" .

    _:sw1 <name> "Star Wars: Episode IV - A New Hope" .
    _:sw1 <release_date> "1977-05-25" .
    _:sw1 <revenue> "775000000" .
    _:sw1 <running_time> "121" .
    _:sw1 <starring> _:luke .
    _:sw1 <starring> _:leia .
    _:sw1 <starring> _:han .
    _:sw1 <director> _:lucas .

    _:sw2 <name> "Star Wars: Episode V - The Empire Strikes Back" .
    _:sw2 <release_date> "1980-05-21" .
    _:sw2 <revenue> "534000000" .
    _:sw2 <running_time> "124" .
    _:sw2 <starring> _:luke .
    _:sw2 <starring> _:leia .
    _:sw2 <starring> _:han .
    _:sw2 <director> _:irvin .

    _:sw3 <name> "Star Wars: Episode VI - Return of the Jedi" .
    _:sw3 <release_date> "1983-05-25" .
    _:sw3 <revenue> "572000000" .
    _:sw3 <running_time> "131" .
    _:sw3 <starring> _:luke .
    _:sw3 <starring> _:leia .
    _:sw3 <starring> _:han .
    _:sw3 <director> _:richard .

    _:st1 <name> "Star Trek: The Motion Picture" .
    _:st1 <release_date> "1979-12-07" .
    _:st1 <revenue> "139000000" .
    _:st1 <running_time> "132" .
  }
}
' | jq | less
```

There's also a JSON-based mutation form, but here we're just using RDF.  s'all good.  Actually not much to say here.  All the actor nodes are just, well, nodes.  You can't even know that they're actors unless you have an `<isa>` edge or something.  The fun of graphs.

Next, we have to setup indices.  Kinda not as spontaneous, but eh.

```sh
curl localhost:8080/alter -XPOST -d $'
  name: string @index(term) .
  release_date: datetime @index(year) .
  revenue: float .
  running_time: int .
' | jq | less
```

I'm supposing you need that to actually query on those things.  I'll have to read more into that later.  In the tutorial, they say it's so we can actually do term matching, filtering, and sorting.  Otherwise, I guess we'd be down to just equality and edge walking?  Hm.

Next, we did a basic query for just every node with at least one `starring` edge, and get them back with their `name` edge.

```sh
curl localhost:8080/query -XPOST -d $'
{
  me(func: has(starring)) {
    name
  }
}
' | python -m json.tool | less
```

This returns 3 nodes, as probably expected:

```json
{
  "data": {
    "me": [
      {
        "name": "Star Wars: Episode IV - A New Hope",
        "uid": "0x3"
      },
      {
        "name": "Star Wars: Episode V - The Empire Strikes Back",
        "uid": "0x4"
      },
      {
        "name": "Star Wars: Episode VI - Return of the Jedi",
        "uid": "0x5"
      }
    ]
  },
  "extensions": {
    "server_latency": {
      "parsing_ns": 12531,
      "processing_ns": 6615340,
      "encoding_ns": 1134729
    },
    "txn": {
      "start_ts": 15
    }
  }
}
```

Interestingly, the response has some metadata in the form of `extensions`.  Curious.  The top level in `data` of course is `me`, since that's what we called it.  We could change it to `movies` instead, and add the `revenue` edge for funsies:

```json
{
  "data": {
    "movies": [
      {
        "name": "Star Wars: Episode IV - A New Hope",
        "revenue": 775000000,
        "uid": "0x3"
      },
      {
        "name": "Star Wars: Episode V - The Empire Strikes Back",
        "revenue": 534000000,
        "uid": "0x4"
      },
      {
        "name": "Star Wars: Episode VI - Return of the Jedi",
        "revenue": 572000000,
        "uid": "0x5"
      }
    ]
  },
  "...": "..."
}
```

Also, `uid` is returned as a string.  Hurray!  String ids is always good.  I mean, they should really be opaque data objects, but this is JSON.  Anyway, strings are fine.

The next query is a bit more complex.  We want...
- Things that...
  - have the term `"Star Wars"` in their `name` edge
  - have a `release_date` of `1980` or later.

And we want some things there, as well as the Director and the Starring Roles.

```sh
curl localhost:8080/query -XPOST -d $'
{
  me(func:allofterms(name, "Star Wars")) @filter(ge(release_date, "1980")) {
    name
    release_date
    revenue
    running_time
    director {
     name
    }
    starring {
     name
    }
  }
}
' | jq | less
```

We get back that stuff:

```json
{
  "data": {
    "me": [
      {
        "name": "Star Wars: Episode V - The Empire Strikes Back",
        "release_date": "1980-05-21T00:00:00Z",
        "revenue": 534000000,
        "running_time": 124,
        "director": [
          {
            "name": "Irvin Kernshner",
            "uid": "0x9"
          }
        ],
        "starring": [
          {
            "name": "Han Solo",
            "uid": "0x1"
          },
          {
            "name": "Luke Skywalker",
            "uid": "0x6"
          },
          {
            "name": "Princess Leia",
            "uid": "0x7"
          }
        ],
        "uid": "0x4"
      },
      {
        "name": "Star Wars: Episode VI - Return of the Jedi",
        "...": "...",
        "uid": "0x5"
      }
    ]
  },
  "...": "..."
}
```

Interesting, it seems to have automatically treated the simple `yyyy-mm-dd` date strings as actual dates, and now returns full ISO8601 datetimes.  I mean, `yyyy-mm-dd` is an ISO8601 date, at least.

> Ah, wait, I believe this is because in the `alter` query above, we state `release_date: datetime @index(year) .` thus declaring it a `datetime`.  Nothing magical here!

Also of note, and probably to be expected, all the other nodes are returned in arrays rather than, well, not.  Good to know.  ... d.

Another note is the use of that `func:allofterms(edge, "terms")`.  While we can always check for exact equality of any string, we can only do terms on a string edge if we first set the schema for that edge with `@index(term)`.  Similarly, we can filter by year on `release_date` because it's a `datetime` with `@index(year)`.  I'm not sure if `revenue` and `running_time` receive any niceties from just declaring them `float` and `int` respectively, other than automatic input coercion.

And that's where it all starts.  It's like a document store but not.  I don't think I considered before about treating every property as an edge, but I mean, that's basically what you say with RDF, so.  Or rather, (some?) graph DBs don't distinguish between node properties and edges that point to scalars.

Should be fun, then.
