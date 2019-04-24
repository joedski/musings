Journal 2019-04-23 - Going through AWS's EKS Workshop
=====================================================

This thayng here: https://eksworkshop.com/introduction/



## Setting Things Up

Enter [here since I'm doing it on my own rather than at an event](https://eksworkshop.com/prerequisites/self_paced/).

First, I need to get an account.  In the workshop instructions, they have you create an acount if you don't have one, but in this case I already have one, so that's that step.

Next, I need to create a work space.  In this case, they're using Cloud9, so that'll be fun.  Let's see how much mental keymap cache missing I do.

After that, I'm directed to create an IAM role named `eksworkshop-admin`.  This is a shared account, so one's already created.  I went through most of the setup anyway, just to take a looksee, then canceled out.  I'll just reuse the same one created by someone because whatever.  We'll see if they notice.

That done, I can now attach that IAM Role to my Workspace.  That's probably the simplest part.


### Installing the Things

Time to install things by copy/pasting console commands.  Always a good time, especially when they begin with `sudo`.  Also `jq` and `gettext`.  `jq` especially is a good time.


### RSA Identity

`ssh-keygen`, enter, enter, enter.  Then, import the public key.  Boom, done.


### eksctl

Now to install a thingy called `eksctl` that helps you control EKS stuff from the command line.

Then, before we proceed further, we should verify that the IAM role has been properly set.  We can check this by looking at the ARN returned by the command `aws sts get-caller-identity`.  If it has the role name we decided on, then all's good.  If not, then we'd need to go back and fix that.

That done, we can actually create a cluster:

```sh
eksctl create cluster \
    --name=eksworkshop-eksctl \
    --nodes=3 \
    --node-ami=auto \
    --region=${AWS_REGION}
```

Should be done in 15 minutes-ish.

And, sure enough, just about 15 minutes on the dot.
