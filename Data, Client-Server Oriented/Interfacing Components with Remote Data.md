Interfacing Components with Remote Data
=======================================

If you don't care about normalizing data in a top-level store, then you can just have every component assume it must request data eagerly.  Otherwise, you should still start with that assumption, then work to make the normalization/denormalization process transparent to the component that requires that data.

Of course, you could go one step further and have the client know (whether through direct input or from an interface file on the server) how to request data from the server based on what a component declares is necessary to render.

See GraphQL + Relay or Apollo for an example of that sort of thing.
