import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Verification } from 'src/users/entities/verification.entity';

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
  let usersRepository: Repository<User>;
  let verificationRepository: Repository<Verification>;
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    verificationRepository = module.get<Repository<Verification>>(
      getRepositoryToken(Verification),
    );
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

  describe('userProfile', () => {
    let userId: number;
    beforeAll(async () => {
      const [user] = await usersRepository.find();
      userId = user.id;
    });

    it("should see a user's profile", () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .set('x-jwt', jwtToken)
        .send({
          query: `{
            userProfile(userId: ${userId}) {
              ok
              error
              user {
                id
              }
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: {
                  ok,
                  error,
                  user: { id },
                },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBe(null);
          expect(id).toBe(userId);
        });
    });

    it('should not find a profile', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .set('x-jwt', jwtToken)
        .send({
          query: `{
            userProfile(userId: 123) {
              ok
              error
              user {
                id
              }
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: { ok, error, user },
              },
            },
          } = res;
          expect(ok).toBeFalsy();
          expect(error).toEqual(expect.any(String));
          expect(user).toBe(null);
        });
    });
  });

  describe('me', () => {
    it('should find my profile', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .set('x-jwt', jwtToken)
        .send({
          query: `{
          me {
            email
          }
        }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toBe(TEST_USER.email);
        });
    });

    it('should not allow logged out user', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .send({
          query: `{
          me {
            email
          }
        }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              errors: [{ message }],
            },
          } = res;

          expect(message).toBe('Forbidden resource');
        });
    });
  });

  describe('editProfile', () => {
    const NEW_EMAIL = 'fixProfile@e2e.test';
    it('should change email', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .set('x-jwt', jwtToken)
        .send({
          query: `mutation {
            editProfile(input: {
              email: "${NEW_EMAIL}"
            }) {
              ok
              error
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBe(null);
        });
    });
    it('should have new email', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .set('x-jwt', jwtToken)
        .send({
          query: `{
          me {
            email
          }
        }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toBe(NEW_EMAIL);
        });
    });
  });

  describe('verifyEmail', () => {
    let verificationCode: string;

    beforeAll(async () => {
      const [verification] = await verificationRepository.find();
      verificationCode = verification.code;
    });

    it('should verify email', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .send({
          query: `mutation {
            verifyEmail(input: {
              code : "${verificationCode}"
            }) {
              ok
              error
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBe(null);
        });
    });

    it('should fail on wrong verification code', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .send({
          query: `mutation {
            verifyEmail(input: {
              code : "false"
            }) {
              ok
              error
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeFalsy();
          expect(error).toEqual(expect.any(String));
        });
    });
  });

  describe('deleteAccount', () => {
    let userId: number;
    beforeAll(async () => {
      const [user] = await usersRepository.find();
      userId = user.id;
    });

    it('should be delete account', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .set('x-jwt', jwtToken)
        .send({
          query: `mutation {
            deleteAccount {
              ok
              error
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                deleteAccount: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBe(null);
        });
    });

    it('should be not found account after delete account', () => {
      return request(app.getHttpServer())
        .post(ENDPOINT)
        .set('x-jwt', jwtToken)
        .send({
          query: `{
            me {
              id
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              errors: [
                {
                  extensions: {
                    response: { statusCode, message },
                  },
                },
              ],
            },
          } = res;
          expect(message).toEqual('Forbidden resource');
          expect(statusCode).toBe(403);
        });
    });
  });
});
