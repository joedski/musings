Journal 2020-04-27 - Docker Compose with Oracle Database EE
========

Recently for work, I needed to setup a local copy of our Oracle database so I wouldn't need to hit the Dev or QA databases (and spam them with items with silly names and possibly kill them with said spam from every dev...).  I hate having to constantly tear down and stand up things, so naturally I turned to Docker and, in this case, Docker Compose.

It was mostly for ports and volumes, but I also needed to put up a local Redis thing for some other caching layer.  But anyway.

As a quick note, I'm not sure if I actually need the `shm_size` setting.  If I don't then I can just remove the Dockerfile and take out the extraneous build step.

As another quick note, I hope it goes without saying that you should never put account passwords, especially administrator passwords, into any plaintext for any service you deploy.  Passwords are in plaintext here because this is purely for local development.

The setup I ended up settling upon was:

- Project Root:
    - `docker-compose.yml`
    - `db/`
        - `Dockerfile` Minimal Dockerfile that just specifies the image.  Not necessary except that we need to specify shm_size.
        - `setup/`
            - `init-db.bash` init script to do all the things: stuff `init-db.sqlplus` into `sqlplus` and then call `impdp` with the parfile.
            - `init-db.sqlplus` script that does any initial setup, mostly creating the DB User/Schema that our service logs in with.
            - `db-01.dmp`, `db-02.dmp`, etc... The dump files.
            - `db.par` the parameters file to go with the dump files.
        - `scripts/` Various scripts to make easier some DB manipulations that can't really be done from normal user service requests.  Things like adding yourself, changing your permissions, etc.  Useful when your app is connected to some corporate SSO.
            - `sqlplus.bash` Minimal script that sources `/home/oracle/.bashrc`, sets the charset to UTF-8, then calls the actual `sqlplus` executable.

The compose file is then very simple:

```yaml
version: "3.7"

services:

  redis:
    image: "redis:latest"
    ports:
      - "6379:6379"

  db:
    build:
      context: ./db
      # This is from an old oracle blog post about setting up
      # an XE docker image.  Not sure if it's necessary.
      # https://blogs.oracle.com/oraclewebcentersuite/implement-oracle-database-xe-as-docker-containers
      shm_size: "2g"
    # Not always necessary, but some setups require remapping the ports.
    # So instead of writing a bash script to parse properties files,
    # we can just use docker-compose!  yay.
    ports:
      - "1523:1521"
    volumes:
      # If you need to test different setups, you can change the
      # host binding in this one then down/up the containers as needed.
      - "./db/setup:/home/oracledb/setup:rw"
      - "./db/scripts:/home/oracledb/scripts:rw"
```

The Dockerfile was even simpler.

```Dockerfile
# Can use non '-slim' too.
FROM store/oracle/database-enterprise:12.2.0.1-slim
```

The `setup/init-db.bash` script is pretty minimal, just automating a couple calls:

```bash
source /home/oracle/.bashrc

set -xe

cd /home/oracledb/setup

# Uses sys user to set things up.
sqlplus 'sys/Oradoc_db1 as sysdba' < init-db.sqlplus
# Uses service user to set up service-specific things.
# Change if necessary.
impdb 'SERVICE_USER/ServiceUserPw@ORCLCDB' PARFILE=/home/oracledb/db.par
```

The `setup/init-db.bash` file is where the service user gets setup.  Nothing fancy there.

```sql
-- NOTE: Undocumented property.  Use at own risk.
alter session set "_ORACLE_SCRIPT"=true;

CREATE USER SERVICE_USER IDENTIFIED BY ServiceUserPw;
GRANT CONNECT, RESOURCE, DBA TO SERVICE_USER;

CREATE DIRECTORY MY_DATA_PUMP_DIR AS '/home/oracledb/dumps';

exit;
```

The `setup/db-01.dmp` and `setup/db.par` files you get from yourself or other devs.

Now for maximum convenience, the `scripts/sqlplus.bash` script:

```bash
# Get sqlplus in the PATH.
source /home/oracle/.bashrc

# UTF-8 powers activate.
export NLS_LANG=.AL32UTF8

set -x
cd /home/oracledb/scripts
sqlplus 'SERVICE_USER/ServiceUserPw@ORCLCDB'
```

That way, if you just want to poke at the local DB directly with SQLPlus, you just do `docker-compose exec db bash scripts/sqlplus.bash` and there you go.
