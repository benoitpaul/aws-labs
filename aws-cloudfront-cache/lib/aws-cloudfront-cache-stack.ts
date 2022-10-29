import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origin from "aws-cdk-lib/aws-cloudfront-origins";

export class AwsCloudfrontCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create the bucket
    const bucket = new s3.Bucket(this, "Bucket", {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // add file to bucket WITHOUT custom cache policy
    new s3deploy.BucketDeployment(this, "DefaultCacheBucketDeployment", {
      sources: [
        s3deploy.Source.asset("./assets", {
          exclude: ["*", "!default-cache-image.jpg"],
        }),
      ],
      destinationBucket: bucket,
    });

    // add file to bucket WITH custom cache policy of 60 seconds
    new s3deploy.BucketDeployment(this, "CustomCacheBucketDeployment", {
      sources: [
        s3deploy.Source.asset("./assets", {
          exclude: ["*", "!custom-cache-image.jpg"],
        }),
      ],
      cacheControl: [s3deploy.CacheControl.maxAge(cdk.Duration.minutes(1))],
      destinationBucket: bucket,
    });

    // create cloudfront distribution
    new cloudfront.Distribution(this, "CloudfrontDistribution", {
      defaultBehavior: {
        origin: new origin.S3Origin(bucket),
      },
    });
  }
}
