import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = createDDbDocClient();
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));

    // 1. get path parameter movieId and query parameter role
    const movieIdParam = event.pathParameters?.movieId;
    const role = event.queryStringParameters?.role;

    // 2. movieId
    if (!movieIdParam) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "movieId path parameter is required",
        }),
      };
    }

    // 3. trans to number
    const movieId = parseInt(movieIdParam, 10);
    if (isNaN(movieId)) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "movieId must be a number" }),
      };
    }

    // 4. use GetCommand / QueryCommand to search
    if (role) {
      const { Item } = await client.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { movieId, role },
        })
      );

      if (!Item) {
        return {
          statusCode: 404,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: `No crew found for movieId=${movieId} with role=${role}`,
          }),
        };
      }

      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Item),
      };
    } else {
      const { Items } = await client.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "movieId = :m",
          ExpressionAttributeValues: {
            ":m": movieId,
          },
        })
      );

      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Items ?? []),
      };
    }
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message || error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
