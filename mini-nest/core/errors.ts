export class HTTPException extends  Error {
    constructor(private response: string | object, private statusCode: number) {
        super();
    }

    getResponse() {
        return this.response;
    }

    getStatus() {
        return this.statusCode;
    }
}

export class BadRequestException extends HTTPException {
    constructor(message: string) {
        super({ message, statusCode: 400, error: 'Bad Request' }, 400);
    }
}

export class InternalServerErrorException extends HTTPException {
    constructor(message: string) {
        super({ message, statusCode: 500, error: 'Internal Server Error' }, 500);
    }
}

export class ForbiddenException extends HTTPException {
    constructor(message: string = 'Forbidden') {
        super({ message, statusCode: 403, error: 'Forbidden' }, 403);
    }
}

export class NotFoundException extends HTTPException {
    constructor(message: string = 'Not Found') {
        super({ message, statusCode: 404, error: 'Not Found' }, 404);
    }
}