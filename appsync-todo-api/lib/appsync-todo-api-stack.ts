import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as appsync from "aws-cdk-lib/aws-appsync";

import * as path from "path";

export class AppsyncTodoApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const todoTable = new dynamodb.Table(this, "ToDoTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const graphqlApi = new appsync.GraphqlApi(this, "ToDoAPI", {
      name: "ToDo API",
      schema: appsync.SchemaFile.fromAsset(
        path.join(__dirname, "schema.graphql")
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            description: "public key for getting data",
            expires: cdk.Expiration.after(cdk.Duration.days(30)),
            name: "API Token",
          },
        },
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      xrayEnabled: true,
    });

    new cdk.CfnOutput(this, "ApiUrl", { value: graphqlApi.graphqlUrl });

    const todoTableDataSource = graphqlApi.addDynamoDbDataSource(
      "ToDoTableDataSource",
      todoTable
    );

    todoTableDataSource.createResolver("QueryToDosResolver", {
      typeName: "Query",
      fieldName: "todos",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set( $limit = $util.defaultIfNull($context.args.limit, 100) )
        #set( $ListRequest = {
          "version": "2018-05-29",
          "limit": $limit
        } )
        #if( $context.args.nextToken )
          #set( $ListRequest.nextToken = $context.args.nextToken )
        #end
        $util.qr($ListRequest.put("operation", "Scan"))
        $util.toJson($ListRequest)
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.error)
          $util.error($ctx.error.message, $ctx.error.type)
        #else
          $util.toJson($ctx.result)
        #end
      `),
    });

    todoTableDataSource.createResolver("MutationAddToDoResolver", {
      typeName: "Mutation",
      fieldName: "addTodo",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition("id").auto(),
        appsync.Values.projecting("newToDo").attribute("completed").is("false")
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    todoTableDataSource.createResolver("MutationAddToDoWithIdResolver", {
      typeName: "Mutation",
      fieldName: "addTodoWithId",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition("id").is("id"),
        appsync.Values.projecting("newToDo").attribute("completed").is("false")
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    todoTableDataSource.createResolver("MutationCompleteToDoResolver", {
      typeName: "Mutation",
      fieldName: "completeTodo",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
      {
          "version": "2018-05-29",
          "operation" : "UpdateItem",
          "key" : {
              "id": $util.dynamodb.toDynamoDBJson($context.arguments.id),
          },
          "update" : {
              "expression": "set #completed = :completed",
              "expressionNames": {
                "#completed": "completed",
              },
              "expressionValues": {
                ":completed": $util.dynamodb.toDynamoDBJson(true),
              }
          },
          "condition": {
            "expression": "attribute_exists(id)"
          }
      }`),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    todoTableDataSource.createResolver("MutationDeleteToDoResolver", {
      typeName: "Mutation",
      fieldName: "deleteTodo",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbDeleteItem(
        "id",
        "id"
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.error)
          $util.error($ctx.error.message, $ctx.error.type)
        #else
          true
        #end
      `),
    });
  }
}
