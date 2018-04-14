User Federation in AWS and GCP with External Identity Providers at a High Level
===============================================================================

Notes on how Federated Users, that is Users whose Identities are not tied to AWS or GCP Accounts but rather are provided by an external Identity Provider (IdP), gain Permission Grants in AWS or GCP.  Examples of external IdPs are SAML providers such as Pingfederate or OIDC providers such as Facebook or Google.  (Yes, you can use Google as your IdP for your Amazon app.)

In general, the process is about mapping User Records in your given User Federation IdP to Permission Grants in AWS or GCP.  The way they go about these things is quite different, as you'll see below.

Where appropriate, I will use the terminology of the platform under discussion, although this will require context switching due to the very large differences in how AWS and GCP name and group things.  Compare what AWS calls a Role (A named set of Policies that Users, Services, et al may temporarily assume, effectively becoming that Role for awhile rather than themselves.) to what GCP calls a Role (A named group of Permission Grants.). I will also largely assume familiarity with these terms.

I also use a few more general terms:
- Permission Grant: A statement that some Principal can perform some Action against some Target.  The exact implementation varies greatly between GCP and IAM.



## AWS IAM and Federated Users

To start with, you'll want to review [AWS IAM Role Terms and Concepts][aws-iam-role-terms].  Like, 17 times, and maybe take a few walks between them.

Essentially, then, integrating with external Identity Providers goes like this:
- Create trust relationship between IdP and AWS.
  - Basically, telling them how to talk to each other and what each other is.  AWS for instance needs to know if the IdP is a SAML or OIDC provider so it knows how to parse the response.
- Add IdP as Principal in a Trust Policy on an IAM Role and create Conditions based on the SAML or OIDC responses that will come from the IdP.
  - This allows you great freedom to map Users in your IdP to IAM Roles that they can assume.  You could do it based on certain specific Scopes/Assertions in their SAML or OIDC record, or you could even allow a specific User access to a given role by name/id.

1. [IAM Role Terms and Concepts][aws-iam-role-terms]
2. [IdPs and IAM Roles][aws-iam-roles-ipds]
3. [Overview on options for federation and AWS][aws-federation-overview]
4. [What the SAML claim needs to have to make AWS happy][aws-saml-claims]
5. [A different take on SAML+AWS Console Access][aws-saml-diff-take]
6. [Example specifically looking at AWS and Active Directory][aws-active-directory]

[aws-federation-overview]: https://aws.amazon.com/identity/federation/
[aws-saml-diff-take]: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_enable-console-saml.html
[aws-active-directory]: https://aws.amazon.com/blogs/security/how-to-establish-federated-access-to-your-aws-resources-by-using-active-directory-user-attributes/
[aws-iam-roles-idps]: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers.html
[aws-saml-claims]: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_saml_assertions.html
[aws-iam-role-terms]: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html



## GCP IAM and Federated Users

GCP's approach is a bit simpler: You just create a Google Account for each User you want to access your Organization's GCP Stuff.  How?  By [going through your LDAP Directory and creating a Google Account for everyone in it][gcp-enterprise-orgs-provisioning-users].  After that, you tell GCP about your SAML provider and whenever anyone wants to log into GCP, it'll get their full user name (`name@domain`) and punt them to your IdP's login page.

1. [GCP, SSO, and Cloud Apps][gcp-sso]
2. [Best Practices for Enterprise][gcp-enterprise-orgs], probably the most relevant to what's being discussed here, or at least when I was first researching this.
  1. [Using Corporate Login Credentials][gcp-enterprise-orgs-login]
3. [SSO via SAML][gcp-sso-saml]

[gcp-sso]: https://cloud.google.com/identity/solutions/enable-sso
[gcp-enterprise-orgs]: https://cloud.google.com/docs/enterprise/best-practices-for-enterprise-organizations
[gcp-enterprise-orgs-corp-login]: https://cloud.google.com/docs/enterprise/best-practices-for-enterprise-organizations#authentication-and-identity
[gcp-enterprise-orgs-provisioning-users]: https://cloud.google.com/docs/enterprise/best-practices-for-enterprise-organizations#provision_users_to_googles_directory
[gcp-sso-saml]: https://support.google.com/a/answer/60224
