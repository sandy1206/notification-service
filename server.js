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

producer.on('ready', () => {
	console.log('Kafka Producer is connected and ready.');
});

producer.on('error', (error) => {
	console.error(error);
});

const sendNotification = (message) => {
	const payloads = [{ topic: 'notifications', messages: message }];
	producer.send(payloads, (error, data) => {
		if (error) {
			console.error(error);
		} else {
			console.log(data);
		}
	});
};

// DynamoDB setup
AWS.config.update({ region: process.env.AWS_REGION });
const dynamoDB = new AWS.DynamoDB.DocumentClient();

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

// Routes
app.get('/health', (req, res) => res.send('Server is running'));

app.post('/notify', (req, res) => {
	const message = req.body.message;
	const notification = {
		NotificationId: new Date().getTime().toString(),
		Message: message,
		Timestamp: new Date().toISOString(),
	};
	sendNotification(message);
	saveNotification(notification);
	res.send('Notification sent and saved');
});

app.listen(port, () => console.log(`Server running on port ${port}`));
