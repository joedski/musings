Journal 2019-04-07 - Algos for Hashing Passwords
========

1. [Password Hashing: PBKDF2, SCrypt, BCrypt (2015)](https://medium.com/@mpreziuso/password-hashing-pbkdf2-scrypt-bcrypt-1ef4bb9c19b3)
    1. Recommends BCrypt as good enough as of 2015.
    2. Says PBKDF2 is too easy to parallelize and run on FPGAs and/or ASICs, and thus disrecommends that.
2. [Password Hashing: SCrypt, BCrypt, ARGON2 (2019-01-05)](https://medium.com/@mpreziuso/password-hashing-pbkdf2-scrypt-bcrypt-and-argon2-e25aaf41598e)
    1. Follow up to (Ss 1), replacing PBKDF2 with ARGON2.
    2. Recommends ARGON2 over anything else, and SCrypt if you can't do ARGON2.
        1. Node's crypto module has SCrypt built in, so I'll use that, I guess.  Should probably switch to ARGON2 at some point, though.
