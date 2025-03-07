/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Neo4jGraphQLAuthJWTPlugin } from "@neo4j/graphql-plugin-auth";
import type { Driver } from "neo4j-driver";
import { graphql } from "graphql";
import { generate } from "randomstring";
import Neo4j from "../../neo4j";
import { Neo4jGraphQL } from "../../../../src/classes";
import { createJwtRequest } from "../../../utils/create-jwt-request";
import { UniqueType } from "../../../utils/graphql-types";

describe("auth/object-path", () => {
    let driver: Driver;
    let neo4j: Neo4j;
    const secret = "secret";
    let User: UniqueType;
    let Post: UniqueType;

    beforeAll(async () => {
        neo4j = new Neo4j();
        driver = await neo4j.getDriver();
    });

    beforeEach(() => {
        User = new UniqueType("User");
        Post = new UniqueType("Post");
    });

    afterAll(async () => {
        await driver.close();
    });

    test("should use object path with allow", async () => {
        const session = await neo4j.getSession({ defaultAccessMode: "WRITE" });

        const typeDefs = `
            type ${User} {
                id: ID
            }

            extend type ${User} @auth(rules: [{ operations: [READ], allow: { id: "$jwt.nested.object.path.sub" } }])
        `;

        const userId = generate({
            charset: "alphabetic",
        });

        const query = `
            {
                ${User.plural}(where: {id: "${userId}"}) {
                    id
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: {
                authorization: {
                    key: "secret",
                },
            },
        });

        try {
            await session.run(`
                CREATE (:${User} {id: "${userId}"})
            `);

            const req = createJwtRequest(secret, {
                nested: {
                    object: {
                        path: {
                            sub: userId,
                        },
                    },
                },
            });

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValuesWithBookmarks(session.lastBookmark(), { req }),
            });

            expect(gqlResult.errors).toBeUndefined();

            const [user] = (gqlResult.data as any)[User.plural];
            expect(user).toEqual({ id: userId });
        } finally {
            await session.close();
        }
    });

    test("should use $context value plucking on auth", async () => {
        const session = await neo4j.getSession({ defaultAccessMode: "WRITE" });

        const typeDefs = `
            type ${User} {
                id: ID
            }

            type ${Post} {
                id: ID
                creator: ${User}! @relationship(type: "HAS_POST", direction: IN)
            }

            extend type ${Post} @auth(rules: [{ operations: [READ], allow: { creator: { id: "$context.userId" } } }])
        `;

        const userId = generate({
            charset: "alphabetic",
        });

        const postId = generate({
            charset: "alphabetic",
        });

        const query = `
            {
                ${Post.plural}(where: {id: "${postId}"}) {
                    id
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: {
                authorization: {
                    key: "secret",
                },
            },
        });

        try {
            await session.run(`
                CREATE (:${User} {id: "${userId}"})-[:HAS_POST]->(:${Post} {id: "${postId}"})
            `);

            const req = createJwtRequest(secret);

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues({ req, userId }),
            });

            expect(gqlResult.errors).toBeUndefined();

            const [post] = (gqlResult.data as any)[Post.plural];
            expect(post).toEqual({ id: postId });
        } finally {
            await session.close();
        }
    });

    test("should use object path with roles", async () => {
        const session = await neo4j.getSession({ defaultAccessMode: "WRITE" });

        const typeDefs = `
            type ${User} {
                id: ID
            }

            extend type ${User} @auth(rules: [{ operations: [READ], roles: ["admin"] }])
        `;

        const userId = generate({
            charset: "alphabetic",
        });

        const query = `
            {
                ${User.plural}(where: {id: "${userId}"}) {
                    id
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret,
                    rolesPath: "https://github\\.com/claims.https://github\\.com/claims/roles",
                }),
            },
        });

        try {
            await session.run(`
                CREATE (:${User} {id: "${userId}"})
            `);

            const req = createJwtRequest(secret, {
                "https://github.com/claims": { "https://github.com/claims/roles": ["admin"] },
            });

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValuesWithBookmarks(session.lastBookmark(), { req }),
            });

            expect(gqlResult.errors).toBeUndefined();
            const [user] = (gqlResult.data as any)[User.plural];

            expect(user).toEqual({ id: userId });
        } finally {
            await session.close();
        }
    });

    test("should use object path with JWT endpoint", async () => {
        const session = await neo4j.getSession({ defaultAccessMode: "WRITE" });

        const typeDefs = `
            type ${User} {
                id: ID
            }

            extend type ${User} @auth(rules: [{ operations: [READ], roles: ["admin"] }])
        `;

        const userId = generate({
            charset: "alphabetic",
        });

        const query = `
            {
                ${User.plural}(where: {id: "${userId}"}) {
                    id
                }
            }
        `;

        // Pass the well-known JWKS Endpoint
        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: {
                authorization: {
                    key: {
                        url: "https://www.YOUR_DOMAIN.com/.well-known/jwks.json",
                    },
                },
            },
        });

        try {
            await session.run(`
                CREATE (:${User} {id: "${userId}"})
            `);

            // Not a valid JWT since signature shall never match
            const req = createJwtRequest(secret);

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValuesWithBookmarks(session.lastBookmark(), { req }),
            });

            // Since we don't have a valid JWKS Endpoint, we will always get an error validating our JWKS
            expect((gqlResult.errors as any[])[0].message).toBe("Forbidden");
        } finally {
            await session.close();
        }
    });
});
