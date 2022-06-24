import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection } from 'typeorm';

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});

const ENDPOINT = '/graphql';
const TEST_USER = {
  email: 'test@test.ing',
  password: 'test',
};

describe('UserModule (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  describe('createAccount', () => {
    it('should create account', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .send({
          query: `
          mutation {
            createAccount(input: {
              email: "${TEST_USER.email}"
              password: "${TEST_USER.password}"
              role: Owner
            }) {
              ok
              error
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBeTruthy();
          expect(res.body.data.createAccount.error).toBe(null);
        });
    });

    it('should fail if account already exists', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .send({
          query: `
          mutation {
            createAccount(input: {
              email: "${TEST_USER.email}"
              password: "${TEST_USER.password}"
              role: Owner
            }) {
              ok
              error
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBeFalsy();
          expect(res.body.data.createAccount.error).toEqual(expect.any(String));
        });
    });
  });

  describe('login', () => {
    it('should login with corrent credentials', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .send({
          query: `
            mutation {
              login(input: {
                email: "${TEST_USER.email}"
                password: "${TEST_USER.password}"
              }) {
                ok
                error
                token
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const { ok, error, token } = res.body.data.login;
          expect(ok).toBeTruthy();
          expect(error).toBe(null);
          expect(token).toEqual(expect.any(String));
          jwtToken = token;
        });
    });

    it('should not be able to login with wrong credentials', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .send({
          query: `
            mutation {
              login(input: {
                email: "${TEST_USER.email}"
                password: "wrong password"
              }) {
                ok
                error
                token
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const { ok, error, token } = res.body.data.login;
          expect(ok).toBeFalsy();
          expect(error).toEqual(expect.any(String));
          expect(token).toBe(null);
        });
    });
  });
  it.todo('userProfile');
  it.todo('me');
  it.todo('verifyEmail');
  it.todo('editProfile');
  it.todo('deleteAccount');
});
