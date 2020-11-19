Journal 2020-09-04 - JPA Criteria API and Multiple Roots
========

Summary of findings regarding using the JPA Criteria API and dealing with multiple Roots. (AKA I hope you really like cross joins 'cause all of your roots?  I turned them into cross joins)

I think the big takeaway here is that the JPA Criteria API deals with Business Entities and their declared relations, not with SQL DBs.  The other big takeaway is that you should create specializations of each relationship, even if those relationships ultimately sit in the same table.

And, granted, you can still do arbitrary joins with [JPQL](https://en.wikipedia.org/wiki/Jakarta_Persistence_Query_Language), but this is about building Criteria, not that.



## Summary

I don't know that I'll ever actually finish this out, but I will at least include the summary:

- You can't do direct joins between JPA entities that don't have direct relations.
    - If your entities that you want to join on don't have direct relations, then consider if you need to refactor the associations in your model.  If you can, anyway...
- Instead, you just have to have multiple roots in your criteria query.
- Multiple roots causes Hibernate to generate Cross Joins in certain environments (certainly Oracle) because without an actual constraint it assumes all possible combinations are required.
- The join condition must then be applied in the normal conditions of the query, the `where` clause, effectively.
- DB implementations are usually smart enough to see `... FROM A CROSS JOIN B WHERE A.B_ID = B.ID ...` and treat it the same as `... FROM A JOIN B ON A.B_ID = B.ID ...`.

This all makes sense because if you don't have an explicit relationship between things, how does whatever JPA implementation you're using know what properties to contsrain the join on?  The constraint must be specified explicitly in such cases.



## Caveat

I make no statement about any of this being the correct way to do things, only that this is the existing setup of a project I joined late, and that my findings are based on that.  Also, still learning things here.



## Appendix: Context

In this project, we have a graph-like setup with Edges and Nodes, but Edges can connect not just Nodes, but also other Edges, or Edges and Nodes.

Both of these extend a base Object entity.

> Note that this is not a complete description of our data model, only a description of the parts necessary to understand Criteria stuff presented here.

In all, our entities look like this at a very high level:

```java
/**
 * Base Entity Class, for all Entities in our data model.
 */
@javax.persistence.Entity
@javax.persistence.Table(name = "APP_OBJECT")
@javax.persistence.Inheritance(strategy = javax.persistence.InheritanceType.JOINED)
@javax.persistence.DiscriminatorColumn(name = "TYPE")
public abstract class AppEntity {

  @javax.persistence.Id
  @javax.persistence.GeneratedValue(generator = "uuid")
  @org.hibernate.annotations.GenericGenerator(
    /* bunch of stuff here for making UUIDs. */
  )
  @lombok.Getter
  @lombok.Setter
  private String id;

  @javax.persistence.Transient
  public String getDiscriminatorValue() {
    DiscriminatorValue val = this.getClass().getAnnotation(DiscriminatorValue.class);

    return val == null ? null : val.value();
  }
}

/**
 * Node, a base for any Things.
 */
@javax.persistence.MappedSuperclass
public class AppNode {

  @javax.persistence.Column(name = "NAME", length = 128)
  @lombok.Getter
  @lombok.Setter
  private String name;

  @javax.persistence.Column(name = "CREATE_BY_USER", length = 50)
  @lombok.Getter
  @lombok.Setter
  private String createByUser;

  @javax.persistence.Column(name = "CREATE_DATE", length = 50)
  @javax.persistence.Temporal(javax.perisistence.TemporalType.TIMESTAMP)
  @lombok.Getter
  @lombok.Setter
  private Date createDate;

  @javax.persistence.Column(name = "MODIFY_BY_USER", length = 50)
  @lombok.Getter
  @lombok.Setter
  private String modifyByUser;

  @javax.persistence.Column(name = "MODIFY_DATE", length = 50)
  @javax.persistence.Temporal(javax.perisistence.TemporalType.TIMESTAMP)
  @lombok.Getter
  @lombok.Setter
  private Date modifyDate;
}

/**
 * Edge, a base for many connections between Things...
 * or other connections.
 *
 * As currently modeled, the from-connections are usually left
 * as a generic AppEntity, while the to-connections are narrowed
 * by whatever is specified by the specific subclass of AppEdge.
 */
@javax.persistence.MappedSuperclass
public class AppEdge {

  @javax.persistence.Column(name = "FROM_TYPE", length = 64)
  @lombok.Getter
  @lombok.Setter
  private String fromType;

  @javax.persistence.Column(name = "TO_TYPE", length = 64)
  @lombok.Getter
  @lombok.Setter
  private String toType;

  @javax.persistence.ManyToOne(
    fetch = javax.persistence.FetchType.LAZY,
    cascade = { javax.persistence.CascadeType.PERSIST }
  )
  @javax.persistence.JoinColumn(name = "FROM_ID", insertable = true, updatable = true)
  @lombok.Getter
  @lombok.Setter
  private AppEntity fromAppEntity;

  // Subclasses must specify toAppEntity (and thus TO_ID).
}
```

> TK: Some actual entities to play with and the meat of the article.
