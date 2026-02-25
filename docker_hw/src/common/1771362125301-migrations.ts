import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1771362125301 implements MigrationInterface {
    name = 'Migrations1771362125301'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "passwordHash" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD CONSTRAINT "FK_199e32a02ddc0f47cd93181d8fd" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order" DROP CONSTRAINT "FK_199e32a02ddc0f47cd93181d8fd"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "passwordHash"`);
    }

}
