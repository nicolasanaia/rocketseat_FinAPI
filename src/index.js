const express = require('express');
const { v4 } = require('uuid');

const app = express();

app.use(express.json())

const customers = [];

function verifyCPFExistence(request, response, next) {
    const { cpf } = request.headers;

    const customer = customers.find((customer) => customer.cpf === cpf);

    if (!customer) return response.status(400).json({ error: 'Customer not found' });

    request.customer = customer;

    return next();
}

function getBalance(statement) {
    const balance = statement.reduce((current, operation) => {
        if (operation.type === 'credit') {
            return current + operation.amount;
        } else {
            return current - operation.amount;
        }

    }, 0);

    return balance;
}

app.post('/account', (request, response) => {
    const { cpf, name } = request.body;

    const customer_already_exists = customers.some(
        (customer) => customer.cpf === cpf
    );

    if (customer_already_exists) return response.status(400).json({
        error: 'Customer already exists!'
    });

    customers.push({
        cpf,
        name,
        id: v4(),
        statement: []
    });

    return response.status(201).send();
})

app.get('/statement', verifyCPFExistence, (request, response) => {
    const { customer } = request;

    return response.json(customer.statement);
})

app.post('/deposit', verifyCPFExistence, (request, response) => {
    const { description, amount } = request.body;

    const { customer } = request;

    const statement_operation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit",
    };

    customer.statement.push(statement_operation);

    return response.status(201).send();
})

app.post('/withdraw', verifyCPFExistence, (request, response) => {
    const { amount } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);

    if (balance < amount) return response.status(400).json({
        error: 'Insufficient funds'
    });

    const statement_operation = {
        amount,
        created_at: new Date(),
        type: 'debit'
    };

    customer.statement.push(statement_operation);

    return response.status(201).send();
})

app.get('/statement/date', verifyCPFExistence, (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const date_format = new Date(date + ' 00:00');

    const statement = customer.statement.filter(
        (statement) =>
            statement.created_at.toDateString() ===
            new Date(date_format).toDateString()
    );

    return response.json(statement);
})

app.put('/account', verifyCPFExistence, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
})

app.get('/account', verifyCPFExistence, (request, response) => {
    const { customer } = request;

    return response.json(customer);
})

app.delete('/account', verifyCPFExistence, (request, response) => {
    const { customer } = request;

    customers.splice(customer, 1);

    return response.status(200).json(customers);
})

app.get('/balance', verifyCPFExistence, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
})

app.listen(3333);