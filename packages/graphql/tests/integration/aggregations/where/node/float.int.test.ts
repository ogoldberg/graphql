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

import type { Driver } from "neo4j-driver";
import { graphql } from "graphql";
import { generate } from "randomstring";
import Neo4j from "../../../neo4j";
import { Neo4jGraphQL } from "../../../../../src/classes";

describe("aggregations-where-node-float", () => {
    let driver: Driver;
    let neo4j: Neo4j;

    beforeAll(async () => {
        neo4j = new Neo4j();
        driver = await neo4j.getDriver();
    });

    afterAll(async () => {
        await driver.close();
    });

    test("should return posts where a like Float is EQUAL to", async () => {
        const session = await neo4j.getSession();

        const typeDefs = `
            type User {
                testString: String!
                someFloat: Float!
            }

            type Post {
              testString: String!
              likes: [User!]! @relationship(type: "LIKES", direction: IN)
            }
        `;

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const someFloat = Math.random() * Math.random() + 10;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        try {
            await session.run(
                `
                    CREATE (:Post {testString: "${testString}"})<-[:LIKES]-(:User {testString: "${testString}", someFloat: ${someFloat}})
                    CREATE (:Post {testString: "${testString}"})
                `
            );

            const query = `
                {
                    posts(where: { testString: "${testString}", likesAggregate: { node: { someFloat_EQUAL: ${someFloat} } } }) {
                        testString
                        likes {
                            testString
                            someFloat
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValuesWithBookmarks(session.lastBookmark()),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any).posts).toEqual([
                {
                    testString,
                    likes: [{ testString, someFloat }],
                },
            ]);
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like Float is GT than", async () => {
        const session = await neo4j.getSession();

        const typeDefs = `
            type User {
                testString: String!
                someFloat: Float!
            }

            type Post {
              testString: String!
              likes: [User!]! @relationship(type: "LIKES", direction: IN)
            }
        `;

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const someFloat = Math.random() * Math.random() + 10;
        const someFloatGt = someFloat - 0.1;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        try {
            await session.run(
                `
                    CREATE (:Post {testString: "${testString}"})<-[:LIKES]-(:User {testString: "${testString}", someFloat: ${someFloat}})
                    CREATE (:Post {testString: "${testString}"})
                `
            );

            const query = `
                {
                    posts(where: { testString: "${testString}", likesAggregate: { node: { someFloat_GT: ${someFloatGt} } } }) {
                        testString
                        likes {
                            testString
                            someFloat
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValuesWithBookmarks(session.lastBookmark()),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any).posts).toEqual([
                {
                    testString,
                    likes: [{ testString, someFloat }],
                },
            ]);
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like Float is GTE than", async () => {
        const session = await neo4j.getSession();

        const typeDefs = `
            type User {
                testString: String!
                someFloat: Float!
            }

            type Post {
              testString: String!
              likes: [User!]! @relationship(type: "LIKES", direction: IN)
            }
        `;

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const someFloat = Math.random() * Math.random() + 10;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        try {
            await session.run(
                `
                    CREATE (:Post {testString: "${testString}"})<-[:LIKES]-(:User {testString: "${testString}", someFloat: ${someFloat}})
                    CREATE (:Post {testString: "${testString}"})
                `
            );

            const query = `
                {
                    posts(where: { testString: "${testString}", likesAggregate: { node: { someFloat_GTE: ${someFloat} } } }) {
                        testString
                        likes {
                            testString
                            someFloat
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValuesWithBookmarks(session.lastBookmark()),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any).posts).toEqual([
                {
                    testString,
                    likes: [{ testString, someFloat }],
                },
            ]);
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like Float is LT than", async () => {
        const session = await neo4j.getSession();

        const typeDefs = `
            type User {
                testString: String!
                someFloat: Float!
            }

            type Post {
              testString: String!
              likes: [User!]! @relationship(type: "LIKES", direction: IN)
            }
        `;

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const someFloat = Math.random() * Math.random() + 10;
        const someFloatLT = someFloat + 0.1;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        try {
            await session.run(
                `
                    CREATE (:Post {testString: "${testString}"})<-[:LIKES]-(:User {testString: "${testString}", someFloat: ${someFloat}})
                    CREATE (:Post {testString: "${testString}"})
                `
            );

            const query = `
                {
                    posts(where: { testString: "${testString}", likesAggregate: { node: { someFloat_LT: ${someFloatLT} } } }) {
                        testString
                        likes {
                            testString
                            someFloat
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValuesWithBookmarks(session.lastBookmark()),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any).posts).toEqual([
                {
                    testString,
                    likes: [{ testString, someFloat }],
                },
            ]);
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like Float is LTE than", async () => {
        const session = await neo4j.getSession();

        const typeDefs = `
            type User {
                testString: String!
                someFloat: Float!
            }

            type Post {
              testString: String!
              likes: [User!]! @relationship(type: "LIKES", direction: IN)
            }
        `;

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const someFloat = Math.random() * Math.random() + 10;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        try {
            await session.run(
                `
                    CREATE (:Post {testString: "${testString}"})<-[:LIKES]-(:User {testString: "${testString}", someFloat: ${someFloat}})
                    CREATE (:Post {testString: "${testString}"})
                `
            );

            const query = `
                {
                    posts(where: { testString: "${testString}", likesAggregate: { node: { someFloat_LTE: ${someFloat} } } }) {
                        testString
                        likes {
                            testString
                            someFloat
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValuesWithBookmarks(session.lastBookmark()),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any).posts).toEqual([
                {
                    testString,
                    likes: [{ testString, someFloat }],
                },
            ]);
        } finally {
            await session.close();
        }
    });
});
