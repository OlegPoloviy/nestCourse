import 'reflect-metadata';
import express from 'express';
import { Injectable } from './core/decorators/injectable';
import { Container } from './core/container';

const app = express();
app.listen(3000, () => {
  console.log('Server running on port 3000');
});

