import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";
import { join } from "path";

export class DynamodbStreamsArchiveStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const invoiceTransactionsTable = new dynamodb.Table(
      this,
      "InvoiceTransactions",
      {
        partitionKey: {
          name: "InvoiceNumber",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "TransactionId",
          type: dynamodb.AttributeType.STRING,
        },
        stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        timeToLiveAttribute: "Expiration",
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    const firehoseRole = new iam.Role(this, "firehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    const archiveBucket = new s3.Bucket(
      this,
      "InvoiceTransactionsArchiveBucket",
      {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    );

    archiveBucket.grantWrite(firehoseRole);

    /**
     * A CloudWatch log group and stream written to when there are failures experienced by the delivery stream.
     */
    const logGroup = new logs.LogGroup(this, `DeliveryStreamLogGroup`, {
      logGroupName: `/aws/kinesisfirehose/TTL-Archive`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const logStream = new logs.LogStream(this, `DeliveryStreamLogStream`, {
      logGroup: logGroup,
      logStreamName: "TTL-Archive",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const firehoseStreamToS3 = new kinesisfirehose.CfnDeliveryStream(
      this,
      "FirehoseStreamToS3",
      {
        deliveryStreamName: "TTL-Archive",
        deliveryStreamType: "DirectPut",
        s3DestinationConfiguration: {
          bucketArn: archiveBucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 1,
            intervalInSeconds: 60,
          },
          compressionFormat: "GZIP",
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },

          prefix: "raw/",
          roleArn: firehoseRole.roleArn,
          cloudWatchLoggingOptions: {
            enabled: true,
            logGroupName: logGroup.logGroupName,
            logStreamName: logStream.logStreamName,
          },
        },
      }
    );

    // Ensures our role is created before we try to create a Kinesis Firehose
    firehoseStreamToS3.node.addDependency(firehoseRole);

    const archiveRecords = new nodejs.NodejsFunction(this, `ArchiveRecords`, {
      entry: join(__dirname, "..", "functions", "archive-records.ts"),
      handler: "handler",
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        DELIVERY_STREAM_NAME: firehoseStreamToS3.deliveryStreamName!,
      },
    });

    invoiceTransactionsTable.grantStreamRead(archiveRecords);
    archiveRecords.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["firehose:PutRecordBatch"],
        resources: [firehoseStreamToS3.attrArn],
      })
    );

    archiveRecords.addEventSource(
      new lambdaEventSources.DynamoEventSource(invoiceTransactionsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        retryAttempts: 3,
        filters: [
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("REMOVE"),
            userIdentity: {
              type: lambda.FilterRule.isEqual("Service"),
              principalId: lambda.FilterRule.isEqual("dynamodb.amazonaws.com"),
            },
          }),
          /*
          {
            Pattern: JSON.stringify({
              userIdentity: {
                type: ["Service"],
                principalId: ["dynamodb.amazonaws.com"],
              },
              eventName: ["REMOVE"],
            }),
          },
          */
        ],
      })
    );
  }
}
