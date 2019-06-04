---
tags:
    - programming-general
    - application-integration
summary: >
    My current thoughts on the installation of integrations with orthogonal parts of applications such as libraries and services.
---

Journal 2019-06-03 - On Integrations, Integration Points, and Integration Implementations
========

- An _Integration_ generally encompasses everything needed to tie the target functionality into the application, including the _Integration Point_, the _Integration Installer_, and the _Integration Installation Implementation_.
- The _Integration Target_ is the service or library whose functionality is being tied into the application.
- An _Integration Point_ is the point in the application code where some _Integration Installation_ is performed, that is to say, some _Integration Installer_ is called.
    - It is the point where there is both enough Specific Application Implementation and enough Application State known to properly initialize the target Integration.
    - Ideally, the only part of an _Integration_ that should be present at the _Integration Point_ should be the call to the _Integration Installer_.  Strive to get as close to this as possible.
    - Thus, all that should happen at the _integration point_ is the following:
        - Gathering of necessary dependencies (data, services, controllers, etc) to call the _Integration Installer_.
        - The call to the _Integration Installer_.
- An _Integration Installer_ is the exposed interface by which the _Implementation Installation Implementation_ is called.
    - It is commonly either a Function or an Adjunct Controller Class.
        - An Adjunct Controller Class or Accessory Controller Class is just a Class that acts as a controller for the given Integration, exposing an App-Specific and App-Meaningful Interface over the underlying library or service.
- An _Integration Installation Implementation_ is the actual code that performs the integration between the parts of the Application passed into it and the target service or library.
    - This is usually just the body of the _Integration Installer_ function or class, however it could also be glue code which itself makes the necessary calls between the application things passed in and some underlying functions or controller class.
