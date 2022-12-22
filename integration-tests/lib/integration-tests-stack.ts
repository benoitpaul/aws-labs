import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { join } from "path";

export class IntegrationTestsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const confirmUserSignup = new nodejs.NodejsFunction(
      this,
      "ConfirmUserSignup",
      {
        entry: join(__dirname, "..", "functions", "confirm-user-signup.ts"),
        environment: {
          USERS_TABLE: usersTable.tableName,
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      }
    );

    usersTable.grantWriteData(confirmUserSignup);

    const userPool = new cognito.UserPool(this, "UserPool", {
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireDigits: false,
        requireSymbols: false,
        requireUppercase: false,
      },
      signInAliases: { email: true },
      standardAttributes: { fullname: { required: false, mutable: true } },
      lambdaTriggers: {
        postConfirmation: confirmUserSignup,
      },
      selfSignUpEnabled: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    confirmUserSignup.addPermission("ConfirmUserSignupPermission", {
      action: "lambda:InvokeFunction",
      principal: new iam.ServicePrincipal("cognito-idp.amazonaws.com"),
      sourceArn: userPool.userPoolArn,
    });

    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: userPool,
      authFlows: { userSrp: true, userPassword: true },
      preventUserExistenceErrors: true,
    });

    new CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, "AwsRegion", { value: cdk.Stack.of(this).region });
  }
}
