Journal 2019-07-30 - Primary Keys in Various Situations
========

There's likely a lot more to PKs than just this...

1. On UUID
    1. [Why Auto Increment is a Terrible Idea][1-1] which argues that UUIDs are a safe default for primary keys with a couple caveats.
        1. Defines two kinds of Primary Keys:
            1. Semantic Keys, where identity is derived from one or more attributes of the entity/record itself.
            2. Technical Keys, where identity is stored as an extra attribute unrelated to the actual data in the entity/record.

[1-1]: https://www.clever-cloud.com/blog/engineering/2015/05/20/why-auto-increment-is-a-terrible-idea/



## On UUID

1. Pro-UUID
    1. UUIDs are Random, which is good because it means you can't just increment the ID to get another record.  [(1.1)][1-1]
        1. Though, you _are_ gating access to records with a permissions system, right?  ... right?  Oh.  _Oh no._
    2. UUIDs are still performant, provided you don't do a dumb and store them as strings.  They're just uint128.
2. Contra-UUID
    1. Data where a primary key is not exposed probably don't need it, and are fine with a "Semantic Primary Key", that is a primary key determined by one or more data of the entity itself.
        1. That is, there's no user-accessible primary key, any such primary key is used only by the DB layer for internal reference purposes.
    2. Where storage is a strong constraint, UUIDs may not be a good choice as, being 128 bit values, they can take 2x ~ 4x the space per entity versus a traditional integer ID.
    3. UUIDs are random, so you lose locality which makes indexing less performant.
        1. Notably, bulk insert performance takes a hit.
        2. This poor indexability also can impact disk usage, on top of the 2x ~ 4x intrinsic space consumption due to being 128 bit values.
