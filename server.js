require('dotenv').config();
const express = require('express');
const kafka = require('kafka-node');
const AWS = require('aws-sdk');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// Kafka setup
const client = new kafka.KafkaClient({ kafkaHost: process.env.KAFKA_BROKER });
const producer = new kafka.Producer(client);
const admin = new kafka.Admin(client);

producer.on('ready', () => {
	console.log('Kafka Producer is connected and ready.');
});

producer.on('error', (error) => {
	console.error(error);
});

// DynamoDB setup
AWS.config.update({ region: process.env.AWS_REGION });
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Create a new Kafka topic
const createTopic = (topicName) => {
	const topics = [{ topic: topicName, partitions: 3, replicationFactor: 1 }];
	admin.createTopics(topics, (err, result) => {
		if (err) {
			console.error(err);
		} else {
			console.log(`Topic ${topicName} created:`, result);
		}
	});
};

// Save notification to DynamoDB
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

// Send notification to Kafka topic
const sendNotification = (topic, message) => {
	const payloads = [{ topic: topic, messages: message }];
	producer.send(payloads, (error, data) => {
		if (error) {
			console.error(error);
		} else {
			console.log(data);
		}
	});
};

// Routes
app.get('/health', (req, res) => res.send('Server is running'));

app.post('/topics', (req, res) => {
	const { topic } = req.body;
	createTopic(topic);
	res.send(`Topic ${topic} created`);
});

app.post('/notify', (req, res) => {
	const { topic, message } = req.body;
	const notification = {
		NotificationId: new Date().getTime().toString(),
		Message: message,
		Timestamp: new Date().toISOString(),
	};
	sendNotification(topic, message);
	saveNotification(notification);
	res.send('Notification sent and saved');
});

app.listen(port, () => console.log(`Server running on port ${port}`));
