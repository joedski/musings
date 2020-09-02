Journal 2020-09-01 - AsyncData and Form Submission
========

In most cases, I've noticed that `AsyncData.NotAsked` is treated basically as synonymous with `AsyncData.Waiting`.  Those cases are always when just doing data reads.

But when doing mutations, as with Create- or Update-Form submissions, that's where `AsyncData.NotAsked` really comes into play: it gives you the state of the request where the user hasn't submitted the form yet.

Thus what would usually be an imperative process, where a request is awaited on, becomes instead a purely reactive process.

- When a given Form interaction is begun, the Form Request State is reset to `AsyncData.NotAsked`.
- When the User submits the Form, the Form Request is dispatched, updating the Form Request State `AsyncData.Waiting`.
- When the request completes or rejects, we get the usual `AsyncData.Data` or `AsyncData.Error`.

All without any imperative `submit` handler to handle the entire flow.

As usual, this can compose with async validation as well, since async validation usually results in a rejection of some sort.
