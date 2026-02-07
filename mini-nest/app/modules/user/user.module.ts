import {Module} from "../../../core/decorators/module";
import {UserController} from "./user.controller";
import {UserService} from "./user.service";

@Module({
    controllers: [UserController],
    providers: [UserService],
    imports : []
})
export class UsersModule{}