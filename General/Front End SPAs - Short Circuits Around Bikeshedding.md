Front End SPAs - Short Circuits Around Bikeshedding
===================================================

This deals more with SPAs than with plain site enhancements, though some could be applicable to such cases.



Interfacing with Remote Data
----------------------------

Do [this](https://medium.com/javascript-inside/slaying-a-ui-antipattern-in-react-64a3b98242c):
- A component receives two things per remote-data prop:
  - A wrapped object representing the current state of the fetch and any resultant values (error, response)
  - A callback which can be used to initiate the actual request and which returns a promise on the settlement of the request, whether an error or not.

[Daggy](https://github.com/fantasyland/daggy) (from the example above) makes this exceedingly easy in vanilla JS, but things like Typescript may require bespoke interfaces since with Daggy you're basically engaging in runtime type/class generation.
