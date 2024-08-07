require('dotenv').config();
const kafka = require('kafka-node');
const AWS = require('aws-sdk');

// Kafka setup
const Consumer = kafka.Consumer;
const client = new kafka.KafkaClient({ kafkaHost: process.env.KAFKA_BROKER });

// DynamoDB setup
AWS.config.update({ region: process.env.AWS_REGION });
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const subscribeToTopics = (topics) => {
	const consumer = new Consumer(
		client,
		topics.map(topic => ({ topic, partition: 0 })),
		{ autoCommit: true }
	);

	consumer.on('message', (message) => {
		console.log('Received message:', message.value);
		const notification = {
			NotificationId: new Date().getTime().toString(),
			Message: message.value,
			Timestamp: new Date().toISOString(),
		};
		saveNotification(notification);
	});

	consumer.on('error', (error) => {
		console.error(error);
	});
};

const saveNotification = (notification) => {
	const params = {
		TableName: process.env.DYNAMODB_TABLE,
		Item: notification,
	};

	dynamoDB.put(params, (error, data) => {
		if (error) {
			console.error(error);
		} else {
			console.log('Notification saved:', data);
		}
	});
};

// Subscribe to topics (you can dynamically manage this list)
const topics = ['notifications']; // Add more topics as needed
subscribeToTopics(topics);

console.log('Kafka Consumer is running...');
