What Is a Model?
================

It's just a framing of the Data in a way meaningful to the given Application.  "Model" doesn't imply "ORM" any more than it implies "Pile of Functions that are just a bunch of SQL queries"; it covers both of those, and any other way you might conceptualize a useful form of your data, where again "useful" here means "useful to the given application".  It could be a bare bones as the above mentioned Pile of Functions, or it could be near magical like SQL Alchemy, or actually magical like ActiveRecords, or somewhere in between like Bookshelf.

Personally I like less magical things, but I tend to feel uncomfortable unless I have some close-enough concept of what's occurring under the hood.

What the Model is _not_ is the Data itself.  The Data is the Data, the Model is just a reframing of it.  Data may be random records in a DB, or documents in a Document Pile, but the Model is Business Entities.
