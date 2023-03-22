import * as glue from "@aws-cdk/aws-glue-alpha";
import * as cdk from "aws-cdk-lib";
import * as athena from "aws-cdk-lib/aws-athena";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as firehose from "aws-cdk-lib/aws-kinesisfirehose";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { join } from "path";

export class DynamodbStreamsKinesisStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const kinesisStream = this.createKinesisStream();
    const bucket = this.createFirehoseToS3(kinesisStream);
    const { glueDatabase, glueTable } = this.createGlueTable(bucket);
    this.createAthena(glueDatabase, glueTable);
  }

  private createKinesisStream(): kinesis.Stream {
    const kinesisStream = new kinesis.Stream(this, "Stream", {
      streamName: "heartrate-kinesis",
      shardCount: 1,
    });

    new dynamodb.Table(this, "Table", {
      tableName: "heartrate-ddb",
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      kinesisStream: kinesisStream,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    return kinesisStream;
  }

  private createFirehoseToS3(kinesisStream: kinesis.Stream): s3.Bucket {
    const firehoseRole = new iam.Role(this, "FirehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    kinesisStream.grantRead(firehoseRole);

    const bucket = new s3.Bucket(this, "Bucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    bucket.grantWrite(firehoseRole);

    const FIREHOSE_NAME = "heartrate-firehose";

    const logGroup = new logs.LogGroup(
      this,
      `${FIREHOSE_NAME}DeliveryStreamLogGroup`,
      {
        logGroupName: `/aws/kinesisfirehose/${FIREHOSE_NAME}`,
        retention: logs.RetentionDays.ONE_DAY,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    const logStream = new logs.LogStream(
      this,
      `${FIREHOSE_NAME}DeliveryStreamLogStream`,
      {
        logGroup: logGroup,
        logStreamName: "S3Delivery",
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    const transformFirehose = new nodejs.NodejsFunction(
      this,
      "TransformFirehose",
      {
        entry: join(__dirname, "..", "functions", "firehose-json-eol.ts"),
        handler: "handler",
        logRetention: logs.RetentionDays.ONE_DAY,
      }
    );

    transformFirehose.grantInvoke(firehoseRole);

    const firehoseStreamToS3 = new firehose.CfnDeliveryStream(
      this,
      "FirehoseStreamToS3",
      {
        deliveryStreamName: FIREHOSE_NAME,
        deliveryStreamType: "KinesisStreamAsSource", // IMPORTANT
        extendedS3DestinationConfiguration: {
          bucketArn: bucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 1,
            intervalInSeconds: 60,
          },
          compressionFormat: "GZIP",
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },

          prefix:
            "data/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/",
          errorOutputPrefix: "errors/",
          roleArn: firehoseRole.roleArn,
          cloudWatchLoggingOptions: {
            enabled: true,
            logGroupName: logGroup.logGroupName,
            logStreamName: logStream.logStreamName,
          },
          // IMPORTANT
          processingConfiguration: {
            enabled: true,
            processors: [
              {
                type: "Lambda",
                parameters: [
                  {
                    parameterName: "LambdaArn",
                    parameterValue: transformFirehose.functionArn,
                  },
                  {
                    parameterName: "RoleArn",
                    parameterValue: firehoseRole.roleArn,
                  },
                ],
              },
            ],
          },
        },
        // IMPORTANT
        kinesisStreamSourceConfiguration: {
          roleArn: firehoseRole.roleArn,
          kinesisStreamArn: kinesisStream.streamArn,
        },
      }
    );

    // Ensures our role is created before we try to create a Kinesis Firehose
    firehoseStreamToS3.node.addDependency(firehoseRole);
    firehoseStreamToS3.node.addDependency(kinesisStream);

    return bucket;
  }

  private createGlueTable(inputBucket: s3.Bucket): {
    glueDatabase: glue.Database;
    glueTable: glue.Table;
  } {
    const glueDatabase = new glue.Database(this, "GlueDatabase", {
      databaseName: "heartrate-glue-db",
    });

    const glueTable = new glue.Table(this, "GlueTable", {
      database: glueDatabase,
      bucket: inputBucket,
      tableName: "heartrate-glue-table",
      dataFormat: glue.DataFormat.JSON,
      columns: [
        {
          name: "dynamodb",
          type: glue.Schema.struct([
            {
              name: "NewImage",
              type: glue.Schema.struct([
                {
                  name: "id",
                  type: glue.Schema.struct([
                    {
                      name: "S",
                      type: glue.Schema.STRING,
                    },
                  ]),
                },
                {
                  name: "HeartRate",
                  type: glue.Schema.struct([
                    {
                      name: "S",
                      type: glue.Schema.INTEGER,
                    },
                  ]),
                },
                {
                  name: "SensorID",
                  type: glue.Schema.struct([
                    {
                      name: "S",
                      type: glue.Schema.INTEGER,
                    },
                  ]),
                },
                {
                  name: "ReportTime",
                  type: glue.Schema.struct([
                    {
                      name: "S",
                      type: glue.Schema.STRING,
                    },
                  ]),
                },
              ]),
            },
          ]),
        },
      ],
    });

    return { glueDatabase, glueTable };
  }

  private createAthena(glueDatabase: glue.Database, glueTable: glue.Table) {
    const athenaOutputBucket = new s3.Bucket(this, "AthenaOutputBucket", {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const athenaRole = new iam.Role(this, "AthenaRole", {
      assumedBy: new iam.ServicePrincipal("athena.amazonaws.com"),
    });

    athenaOutputBucket.grantReadWrite(athenaRole);

    const ATHENA_OUTPUT_PREFIX = "athena-output";
    const athenaWorkgroup = new athena.CfnWorkGroup(this, "AthenaWorkGroup", {
      name: "heartrate-athena-workgroup",
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${athenaOutputBucket.bucketName}/${ATHENA_OUTPUT_PREFIX}`,
        },
      },
    });

    const namedQuery = new athena.CfnNamedQuery(
      this,
      "query-current-ddb-state",
      {
        database: glueDatabase.databaseName,
        queryString: `SELECT dynamodb.newimage.Id.S as ID,
	dynamodb.newimage.HeartRate.S as HeartRate,
	dynamodb.newimage.SensorID.S as SensorID,
	dynamodb.newimage.ReportTime.S as ReportTime
FROM "${glueTable.tableName}"
WHERE dynamodb.newimage.HeartRate.S > 120
      `,
        name: "hight-heart-rate",
        workGroup: athenaWorkgroup.name,
      }
    );

    namedQuery.addDependency(athenaWorkgroup);
  }
}
