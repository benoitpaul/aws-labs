# Cloudfront distribution with custom Cache-Control per S3 object

This demo showcases a cloudfront distribution with an S3 origin.

![Architecture](https://github.com/benoitpaul/aws-labs/raw/main/aws-cloudfront-cache/Architecture.png)

The distribution default behavior provide a default TTL of 86,400 seconds (24h), meaning content is cached for 24h by default.

In order to set a custom cache policy per object, you can set its `Cache-Control` metadata with a `max-age` value (in seconds)

```
cacheControl: [s3deploy.CacheControl.maxAge(cdk.Duration.minutes(1))]
```
