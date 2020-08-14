Journal 2020-08-13 - Better Route Configuration and Navigation With Functions
========

You know what's nice?  Having valid routes encoded in tool friendly functions.  Then, instead of having to go back to the router definition, you could just use the function to create a valid route to push to.

```js
function goToBusiness(businessId) {
  this.$router.push(routes.businessProfilePage({ businessId }));
}
```

Mmmmmm, delicious.
