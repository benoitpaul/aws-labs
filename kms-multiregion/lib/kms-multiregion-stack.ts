import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as kms from "aws-cdk-lib/aws-kms";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { SSMParameterReader } from "./SSMParameterReader";

const PRIMARY_KEY_ARN = "PRIMARY_KEY_ARN";

const createPolicy = (stack: cdk.Stack): any => {
  return {
    Statement: [
      {
        Sid: "Enable IAM policies",
        Effect: "Allow",
        Principal: {
          AWS: `arn:${cdk.Stack.of(stack).partition}:iam::${
            cdk.Stack.of(stack).account
          }:root`,
        },
        Action: "kms:*",
        Resource: "*",
      },
    ],
  };
};

export class PrimaryStack extends cdk.Stack {
  public readonly primaryKeyArn: string;
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const primaryKey = new kms.CfnKey(this, "KmsPrimaryKey", {
      keyPolicy: createPolicy(this),
      multiRegion: true,
    });

    this.primaryKeyArn = primaryKey.attrArn;

    new ssm.StringParameter(this, "PrimaryKeyArn", {
      parameterName: PRIMARY_KEY_ARN,
      description: "The primary key ARN to be replicated",
      stringValue: primaryKey.attrArn,
    });
  }
}

export class ReplicaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const primaryKeyArnSSMReader = new SSMParameterReader(
      this,
      "PrimaryKeyArnSSMReader",
      {
        parameterName: PRIMARY_KEY_ARN,
        region: "us-east-1",
      }
    );

    const primaryKeyArn = primaryKeyArnSSMReader.getParameterValue();

    new kms.CfnReplicaKey(this, "KmsReplicaKey", {
      primaryKeyArn,
      keyPolicy: createPolicy(this),
    });
  }
}
