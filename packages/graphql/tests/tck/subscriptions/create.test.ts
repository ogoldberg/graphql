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

import { gql } from "graphql-tag";
import type { DocumentNode } from "graphql";
import { TestSubscriptionsPlugin } from "../../utils/TestSubscriptionPlugin";
import { Neo4jGraphQL } from "../../../src";
import { createJwtRequest } from "../../utils/create-jwt-request";
import { formatCypher, translateQuery, formatParams } from "../utils/tck-test-utils";

describe("Subscriptions metadata on create", () => {
    let typeDefs: DocumentNode;
    let neoSchema: Neo4jGraphQL;
    let plugin: TestSubscriptionsPlugin;

    beforeAll(() => {
        plugin = new TestSubscriptionsPlugin();
        typeDefs = gql`
            type Actor {
                name: String!
                movies: [Movie!]! @relationship(type: "ACTED_IN", direction: OUT)
            }

            type Movie {
                id: ID!
                actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN)
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
            plugins: {
                subscriptions: plugin,
            } as any,
        });
    });

    test("Create with create relation: connect event", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                actors: [Actor!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: IN)
            }

            type Actor {
                name: String!
                movies: [Movie!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: OUT)
            }

            interface ActedIn {
                screenTime: Int!
            }
        `;

        const query = gql`
            mutation {
                createMovies(
                    input: [
                        {
                            title: "Forrest Gump"
                            actors: { create: [{ node: { name: "Tom Hanks" }, edge: { screenTime: 60 } }] }
                        }
                    ]
                ) {
                    movies {
                        title
                        actorsConnection {
                            edges {
                                screenTime
                                node {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(
            new Neo4jGraphQL({
                typeDefs,
                plugins: {
                    subscriptions: plugin,
                } as any,
            }),
            query,
            {
                req,
            }
        );
        // TODO: make a test with rel type as union/ interface
        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.title = $this0_title
            CREATE (this0_actors0_node:Actor)
            SET this0_actors0_node.name = $this0_actors0_node_name
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node), properties: { old: null, new: this0_actors0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this0, this0_actors0_node
            MERGE (this0)<-[this0_actors0_relationship:ACTED_IN]-(this0_actors0_node)
            SET this0_actors0_relationship.screenTime = $this0_actors0_relationship_screenTime
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0), id: id(this0_actors0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0 { .* }, relationship: this0_actors0_relationship { .* } } } AS meta, this0, this0_actors0_node
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            WITH this0, this0_meta AS meta
            CALL {
                WITH this0
                MATCH (this0)<-[create_this0:ACTED_IN]-(create_this1:\`Actor\`)
                WITH { screenTime: create_this0.screenTime, node: { name: create_this1.name } } AS edge
                WITH collect(edge) AS edges
                WITH edges, size(edges) AS totalCount
                RETURN { edges: edges, totalCount: totalCount } AS create_var2
            }
            RETURN [ this0 { .title, actorsConnection: create_var2 } ] AS data, meta"
        `);
        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_title\\": \\"Forrest Gump\\",
                \\"this0_actors0_node_name\\": \\"Tom Hanks\\",
                \\"this0_actors0_relationship_screenTime\\": {
                    \\"low\\": 60,
                    \\"high\\": 0
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Create with create relation without properties: connect event", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN)
            }

            type Actor {
                name: String!
                movies: [Movie!]! @relationship(type: "ACTED_IN", direction: OUT)
            }
        `;

        const query = gql`
            mutation {
                createMovies(
                    input: [{ title: "Forrest Gump", actors: { create: [{ node: { name: "Tom Hanks" } }] } }]
                ) {
                    movies {
                        title
                        actorsConnection {
                            edges {
                                node {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(
            new Neo4jGraphQL({
                typeDefs,
                plugins: {
                    subscriptions: plugin,
                } as any,
            }),
            query,
            {
                req,
            }
        );

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.title = $this0_title
            CREATE (this0_actors0_node:Actor)
            SET this0_actors0_node.name = $this0_actors0_node_name
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node), properties: { old: null, new: this0_actors0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this0, this0_actors0_node
            MERGE (this0)<-[this0_actors0_relationship:ACTED_IN]-(this0_actors0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0), id: id(this0_actors0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0 { .* }, relationship: this0_actors0_relationship { .* } } } AS meta, this0, this0_actors0_node
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            WITH this0, this0_meta AS meta
            CALL {
                WITH this0
                MATCH (this0)<-[create_this0:ACTED_IN]-(create_this1:\`Actor\`)
                WITH { node: { name: create_this1.name } } AS edge
                WITH collect(edge) AS edges
                WITH edges, size(edges) AS totalCount
                RETURN { edges: edges, totalCount: totalCount } AS create_var2
            }
            RETURN [ this0 { .title, actorsConnection: create_var2 } ] AS data, meta"
        `);
        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_title\\": \\"Forrest Gump\\",
                \\"this0_actors0_node_name\\": \\"Tom Hanks\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Create with nested create relation: connect event", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                actors: [Actor!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: IN)
            }

            type Actor {
                name: String!
                movies: [Movie!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: OUT)
            }

            interface ActedIn {
                screenTime: Int!
            }
        `;

        const query = gql`
            mutation {
                createMovies(
                    input: [
                        {
                            title: "Forrest Gump"
                            actors: {
                                create: [
                                    {
                                        node: {
                                            name: "Tom Hanks"
                                            movies: {
                                                create: [{ node: { title: "Funny movie" }, edge: { screenTime: 1990 } }]
                                            }
                                        }
                                        edge: { screenTime: 60 }
                                    }
                                ]
                            }
                        }
                    ]
                ) {
                    movies {
                        title
                        actorsConnection {
                            edges {
                                screenTime
                                node {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(
            new Neo4jGraphQL({
                typeDefs,
                plugins: {
                    subscriptions: plugin,
                } as any,
            }),
            query,
            {
                req,
            }
        );

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.title = $this0_title
            CREATE (this0_actors0_node:Actor)
            SET this0_actors0_node.name = $this0_actors0_node_name
            CREATE (this0_actors0_node_movies0_node:Movie)
            SET this0_actors0_node_movies0_node.title = $this0_actors0_node_movies0_node_title
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node_movies0_node), properties: { old: null, new: this0_actors0_node_movies0_node { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0, this0_actors0_node, this0_actors0_node_movies0_node
            MERGE (this0_actors0_node)-[this0_actors0_node_movies0_relationship:ACTED_IN]->(this0_actors0_node_movies0_node)
            SET this0_actors0_node_movies0_relationship.screenTime = $this0_actors0_node_movies0_relationship_screenTime
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0_actors0_node_movies0_node), id: id(this0_actors0_node_movies0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0_actors0_node_movies0_node { .* }, relationship: this0_actors0_node_movies0_relationship { .* } } } AS meta, this0, this0_actors0_node, this0_actors0_node_movies0_node
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node), properties: { old: null, new: this0_actors0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this0, this0_actors0_node
            MERGE (this0)<-[this0_actors0_relationship:ACTED_IN]-(this0_actors0_node)
            SET this0_actors0_relationship.screenTime = $this0_actors0_relationship_screenTime
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0), id: id(this0_actors0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0 { .* }, relationship: this0_actors0_relationship { .* } } } AS meta, this0, this0_actors0_node
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            WITH this0, this0_meta AS meta
            CALL {
                WITH this0
                MATCH (this0)<-[create_this0:ACTED_IN]-(create_this1:\`Actor\`)
                WITH { screenTime: create_this0.screenTime, node: { name: create_this1.name } } AS edge
                WITH collect(edge) AS edges
                WITH edges, size(edges) AS totalCount
                RETURN { edges: edges, totalCount: totalCount } AS create_var2
            }
            RETURN [ this0 { .title, actorsConnection: create_var2 } ] AS data, meta"
        `);
        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_title\\": \\"Forrest Gump\\",
                \\"this0_actors0_node_name\\": \\"Tom Hanks\\",
                \\"this0_actors0_node_movies0_node_title\\": \\"Funny movie\\",
                \\"this0_actors0_node_movies0_relationship_screenTime\\": {
                    \\"low\\": 1990,
                    \\"high\\": 0
                },
                \\"this0_actors0_relationship_screenTime\\": {
                    \\"low\\": 60,
                    \\"high\\": 0
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Create with create relation to union field: connect event", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                actors: [Actor!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: IN)
                directors: [Director!]! @relationship(type: "DIRECTED", properties: "Directed", direction: IN)
            }

            type Actor {
                name: String!
                movies: [Movie!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: OUT)
            }

            interface ActedIn {
                screenTime: Int!
            }

            interface Directed {
                year: Int!
            }

            type Person {
                name: String!
            }

            union Director = Person | Actor
        `;

        const query = gql`
            mutation {
                createMovies(
                    input: [
                        {
                            title: "The Matrix"
                            directors: {
                                Actor: { create: [{ node: { name: "Keanu Reeves" }, edge: { year: 2420 } }] }
                                Person: { create: [{ node: { name: "Lilly Wachowski" }, edge: { year: 1999 } }] }
                            }
                        }
                    ]
                ) {
                    movies {
                        title
                        directors {
                            ... on Person {
                                name
                            }
                            ... on Actor {
                                name
                            }
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(
            new Neo4jGraphQL({
                typeDefs,
                plugins: {
                    subscriptions: plugin,
                } as any,
            }),
            query,
            {
                req,
            }
        );

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.title = $this0_title
            CREATE (this0_directors_Actor0_node:Actor)
            SET this0_directors_Actor0_node.name = $this0_directors_Actor0_node_name
            WITH meta + { event: \\"create\\", id: id(this0_directors_Actor0_node), properties: { old: null, new: this0_directors_Actor0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this0, this0_directors_Actor0_node
            MERGE (this0)<-[this0_directors_Actor0_relationship:DIRECTED]-(this0_directors_Actor0_node)
            SET this0_directors_Actor0_relationship.year = $this0_directors_Actor0_relationship_year
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_directors_Actor0_node), id_to: id(this0), id: id(this0_directors_Actor0_relationship), relationshipName: \\"DIRECTED\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_directors_Actor0_node { .* }, to: this0 { .* }, relationship: this0_directors_Actor0_relationship { .* } } } AS meta, this0, this0_directors_Actor0_node
            CREATE (this0_directors_Person0_node:Person)
            SET this0_directors_Person0_node.name = $this0_directors_Person0_node_name
            WITH meta + { event: \\"create\\", id: id(this0_directors_Person0_node), properties: { old: null, new: this0_directors_Person0_node { .* } }, timestamp: timestamp(), typename: \\"Person\\" } AS meta, this0, this0_directors_Person0_node
            MERGE (this0)<-[this0_directors_Person0_relationship:DIRECTED]-(this0_directors_Person0_node)
            SET this0_directors_Person0_relationship.year = $this0_directors_Person0_relationship_year
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_directors_Person0_node), id_to: id(this0), id: id(this0_directors_Person0_relationship), relationshipName: \\"DIRECTED\\", fromTypename: \\"Person\\", toTypename: \\"Movie\\", properties: { from: this0_directors_Person0_node { .* }, to: this0 { .* }, relationship: this0_directors_Person0_relationship { .* } } } AS meta, this0, this0_directors_Person0_node
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            WITH this0, this0_meta AS meta
            CALL {
                WITH this0
                CALL {
                    WITH *
                    MATCH (this0)<-[create_this0:DIRECTED]-(create_this1:\`Actor\`)
                    WITH create_this1 { __resolveType: \\"Actor\\", __id: id(this0), .name } AS create_this1
                    RETURN create_this1 AS create_var2
                    UNION
                    WITH *
                    MATCH (this0)<-[create_this3:DIRECTED]-(create_this4:\`Person\`)
                    WITH create_this4 { __resolveType: \\"Person\\", __id: id(this0), .name } AS create_this4
                    RETURN create_this4 AS create_var2
                }
                WITH create_var2
                RETURN collect(create_var2) AS create_var2
            }
            RETURN [ this0 { .title, directors: create_var2 } ] AS data, meta"
        `);
        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_title\\": \\"The Matrix\\",
                \\"this0_directors_Actor0_node_name\\": \\"Keanu Reeves\\",
                \\"this0_directors_Actor0_relationship_year\\": {
                    \\"low\\": 2420,
                    \\"high\\": 0
                },
                \\"this0_directors_Person0_node_name\\": \\"Lilly Wachowski\\",
                \\"this0_directors_Person0_relationship_year\\": {
                    \\"low\\": 1999,
                    \\"high\\": 0
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Create with nested create relation to union field: connect event", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                actors: [Actor!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: IN)
                directors: [Director!]! @relationship(type: "DIRECTED", properties: "Directed", direction: IN)
            }

            type Actor {
                name: String!
                movies: [Movie!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: OUT)
            }

            interface ActedIn {
                screenTime: Int!
            }

            interface Directed {
                year: Int!
            }

            type Person {
                name: String!
            }

            union Director = Person | Actor
        `;

        const query = gql`
            mutation {
                createMovies(
                    input: [
                        {
                            title: "The Matrix"
                            directors: {
                                Actor: {
                                    create: [
                                        {
                                            node: {
                                                name: "Keanu Reeves"
                                                movies: {
                                                    create: [
                                                        { node: { title: "Funny movie" }, edge: { screenTime: 190 } }
                                                    ]
                                                }
                                            }
                                            edge: { year: 2420 }
                                        }
                                    ]
                                }
                                Person: { create: [{ node: { name: "Lilly Wachowski" }, edge: { year: 1999 } }] }
                            }
                        }
                    ]
                ) {
                    movies {
                        title
                        directors {
                            ... on Person {
                                name
                            }
                            ... on Actor {
                                name
                                movies {
                                    title
                                }
                            }
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(
            new Neo4jGraphQL({
                typeDefs,
                plugins: {
                    subscriptions: plugin,
                } as any,
            }),
            query,
            {
                req,
            }
        );

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.title = $this0_title
            CREATE (this0_directors_Actor0_node:Actor)
            SET this0_directors_Actor0_node.name = $this0_directors_Actor0_node_name
            CREATE (this0_directors_Actor0_node_movies0_node:Movie)
            SET this0_directors_Actor0_node_movies0_node.title = $this0_directors_Actor0_node_movies0_node_title
            WITH meta + { event: \\"create\\", id: id(this0_directors_Actor0_node_movies0_node), properties: { old: null, new: this0_directors_Actor0_node_movies0_node { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0, this0_directors_Actor0_node, this0_directors_Actor0_node_movies0_node
            MERGE (this0_directors_Actor0_node)-[this0_directors_Actor0_node_movies0_relationship:ACTED_IN]->(this0_directors_Actor0_node_movies0_node)
            SET this0_directors_Actor0_node_movies0_relationship.screenTime = $this0_directors_Actor0_node_movies0_relationship_screenTime
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_directors_Actor0_node), id_to: id(this0_directors_Actor0_node_movies0_node), id: id(this0_directors_Actor0_node_movies0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_directors_Actor0_node { .* }, to: this0_directors_Actor0_node_movies0_node { .* }, relationship: this0_directors_Actor0_node_movies0_relationship { .* } } } AS meta, this0, this0_directors_Actor0_node, this0_directors_Actor0_node_movies0_node
            WITH meta + { event: \\"create\\", id: id(this0_directors_Actor0_node), properties: { old: null, new: this0_directors_Actor0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this0, this0_directors_Actor0_node
            MERGE (this0)<-[this0_directors_Actor0_relationship:DIRECTED]-(this0_directors_Actor0_node)
            SET this0_directors_Actor0_relationship.year = $this0_directors_Actor0_relationship_year
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_directors_Actor0_node), id_to: id(this0), id: id(this0_directors_Actor0_relationship), relationshipName: \\"DIRECTED\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_directors_Actor0_node { .* }, to: this0 { .* }, relationship: this0_directors_Actor0_relationship { .* } } } AS meta, this0, this0_directors_Actor0_node
            CREATE (this0_directors_Person0_node:Person)
            SET this0_directors_Person0_node.name = $this0_directors_Person0_node_name
            WITH meta + { event: \\"create\\", id: id(this0_directors_Person0_node), properties: { old: null, new: this0_directors_Person0_node { .* } }, timestamp: timestamp(), typename: \\"Person\\" } AS meta, this0, this0_directors_Person0_node
            MERGE (this0)<-[this0_directors_Person0_relationship:DIRECTED]-(this0_directors_Person0_node)
            SET this0_directors_Person0_relationship.year = $this0_directors_Person0_relationship_year
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_directors_Person0_node), id_to: id(this0), id: id(this0_directors_Person0_relationship), relationshipName: \\"DIRECTED\\", fromTypename: \\"Person\\", toTypename: \\"Movie\\", properties: { from: this0_directors_Person0_node { .* }, to: this0 { .* }, relationship: this0_directors_Person0_relationship { .* } } } AS meta, this0, this0_directors_Person0_node
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            WITH this0, this0_meta AS meta
            CALL {
                WITH this0
                CALL {
                    WITH *
                    MATCH (this0)<-[create_this0:DIRECTED]-(create_this1:\`Actor\`)
                    CALL {
                        WITH create_this1
                        MATCH (create_this1)-[create_this2:ACTED_IN]->(create_this3:\`Movie\`)
                        WITH create_this3 { .title } AS create_this3
                        RETURN collect(create_this3) AS create_var4
                    }
                    WITH create_this1 { __resolveType: \\"Actor\\", __id: id(this0), .name, movies: create_var4 } AS create_this1
                    RETURN create_this1 AS create_var5
                    UNION
                    WITH *
                    MATCH (this0)<-[create_this6:DIRECTED]-(create_this7:\`Person\`)
                    WITH create_this7 { __resolveType: \\"Person\\", __id: id(this0), .name } AS create_this7
                    RETURN create_this7 AS create_var5
                }
                WITH create_var5
                RETURN collect(create_var5) AS create_var5
            }
            RETURN [ this0 { .title, directors: create_var5 } ] AS data, meta"
        `);
        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_title\\": \\"The Matrix\\",
                \\"this0_directors_Actor0_node_name\\": \\"Keanu Reeves\\",
                \\"this0_directors_Actor0_node_movies0_node_title\\": \\"Funny movie\\",
                \\"this0_directors_Actor0_node_movies0_relationship_screenTime\\": {
                    \\"low\\": 190,
                    \\"high\\": 0
                },
                \\"this0_directors_Actor0_relationship_year\\": {
                    \\"low\\": 2420,
                    \\"high\\": 0
                },
                \\"this0_directors_Person0_node_name\\": \\"Lilly Wachowski\\",
                \\"this0_directors_Person0_relationship_year\\": {
                    \\"low\\": 1999,
                    \\"high\\": 0
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Simple Create", async () => {
        const query = gql`
            mutation {
                createMovies(input: [{ id: "1" }]) {
                    movies {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.id = $this0_id
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            WITH this0, this0_meta AS meta
            RETURN [ this0 { .id } ] AS data, meta"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_id\\": \\"1\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Multi Create", async () => {
        const query = gql`
            mutation {
                createMovies(input: [{ id: "1" }, { id: "2" }]) {
                    movies {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.id = $this0_id
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            CALL {
            WITH [] AS meta
            CREATE (this1:Movie)
            SET this1.id = $this1_id
            WITH meta + { event: \\"create\\", id: id(this1), properties: { old: null, new: this1 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this1
            RETURN this1, meta AS this1_meta
            }
            WITH this0, this1, this0_meta + this1_meta AS meta
            RETURN [ this0 { .id }, this1 { .id } ] AS data, meta"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_id\\": \\"1\\",
                \\"this1_id\\": \\"2\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Nested Create", async () => {
        const query = gql`
            mutation {
                createMovies(input: [{ id: "1", actors: { create: { node: { name: "Andrés" } } } }]) {
                    movies {
                        id
                        actors {
                            name
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.id = $this0_id
            CREATE (this0_actors0_node:Actor)
            SET this0_actors0_node.name = $this0_actors0_node_name
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node), properties: { old: null, new: this0_actors0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this0, this0_actors0_node
            MERGE (this0)<-[this0_actors0_relationship:ACTED_IN]-(this0_actors0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0), id: id(this0_actors0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0 { .* }, relationship: this0_actors0_relationship { .* } } } AS meta, this0, this0_actors0_node
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            WITH this0, this0_meta AS meta
            CALL {
                WITH this0
                MATCH (this0)<-[create_this0:ACTED_IN]-(create_this1:\`Actor\`)
                WITH create_this1 { .name } AS create_this1
                RETURN collect(create_this1) AS create_var2
            }
            RETURN [ this0 { .id, actors: create_var2 } ] AS data, meta"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_id\\": \\"1\\",
                \\"this0_actors0_node_name\\": \\"Andrés\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Triple nested Create", async () => {
        const query = gql`
            mutation {
                createMovies(
                    input: [
                        {
                            id: "1"
                            actors: { create: { node: { name: "Andrés", movies: { create: { node: { id: 6 } } } } } }
                        }
                    ]
                ) {
                    movies {
                        id
                        actors {
                            name
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.id = $this0_id
            CREATE (this0_actors0_node:Actor)
            SET this0_actors0_node.name = $this0_actors0_node_name
            CREATE (this0_actors0_node_movies0_node:Movie)
            SET this0_actors0_node_movies0_node.id = $this0_actors0_node_movies0_node_id
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node_movies0_node), properties: { old: null, new: this0_actors0_node_movies0_node { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0, this0_actors0_node, this0_actors0_node_movies0_node
            MERGE (this0_actors0_node)-[this0_actors0_node_movies0_relationship:ACTED_IN]->(this0_actors0_node_movies0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0_actors0_node_movies0_node), id: id(this0_actors0_node_movies0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0_actors0_node_movies0_node { .* }, relationship: this0_actors0_node_movies0_relationship { .* } } } AS meta, this0, this0_actors0_node, this0_actors0_node_movies0_node
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node), properties: { old: null, new: this0_actors0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this0, this0_actors0_node
            MERGE (this0)<-[this0_actors0_relationship:ACTED_IN]-(this0_actors0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0), id: id(this0_actors0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0 { .* }, relationship: this0_actors0_relationship { .* } } } AS meta, this0, this0_actors0_node
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            WITH this0, this0_meta AS meta
            CALL {
                WITH this0
                MATCH (this0)<-[create_this0:ACTED_IN]-(create_this1:\`Actor\`)
                WITH create_this1 { .name } AS create_this1
                RETURN collect(create_this1) AS create_var2
            }
            RETURN [ this0 { .id, actors: create_var2 } ] AS data, meta"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_id\\": \\"1\\",
                \\"this0_actors0_node_name\\": \\"Andrés\\",
                \\"this0_actors0_node_movies0_node_id\\": \\"6\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Quadruple nested Create", async () => {
        const query = gql`
            mutation {
                createMovies(
                    input: [
                        {
                            id: "1"
                            actors: {
                                create: {
                                    node: {
                                        name: "Andrés"
                                        movies: {
                                            create: {
                                                node: { id: 6, actors: { create: { node: { name: "Thomas" } } } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                ) {
                    movies {
                        id
                        actors {
                            name
                            movies {
                                id
                                actors {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.id = $this0_id
            CREATE (this0_actors0_node:Actor)
            SET this0_actors0_node.name = $this0_actors0_node_name
            CREATE (this0_actors0_node_movies0_node:Movie)
            SET this0_actors0_node_movies0_node.id = $this0_actors0_node_movies0_node_id
            CREATE (this0_actors0_node_movies0_node_actors0_node:Actor)
            SET this0_actors0_node_movies0_node_actors0_node.name = $this0_actors0_node_movies0_node_actors0_node_name
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node_movies0_node_actors0_node), properties: { old: null, new: this0_actors0_node_movies0_node_actors0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this0, this0_actors0_node, this0_actors0_node_movies0_node, this0_actors0_node_movies0_node_actors0_node
            MERGE (this0_actors0_node_movies0_node)<-[this0_actors0_node_movies0_node_actors0_relationship:ACTED_IN]-(this0_actors0_node_movies0_node_actors0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node_movies0_node_actors0_node), id_to: id(this0_actors0_node_movies0_node), id: id(this0_actors0_node_movies0_node_actors0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node_movies0_node_actors0_node { .* }, to: this0_actors0_node_movies0_node { .* }, relationship: this0_actors0_node_movies0_node_actors0_relationship { .* } } } AS meta, this0, this0_actors0_node, this0_actors0_node_movies0_node, this0_actors0_node_movies0_node_actors0_node
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node_movies0_node), properties: { old: null, new: this0_actors0_node_movies0_node { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0, this0_actors0_node, this0_actors0_node_movies0_node
            MERGE (this0_actors0_node)-[this0_actors0_node_movies0_relationship:ACTED_IN]->(this0_actors0_node_movies0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0_actors0_node_movies0_node), id: id(this0_actors0_node_movies0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0_actors0_node_movies0_node { .* }, relationship: this0_actors0_node_movies0_relationship { .* } } } AS meta, this0, this0_actors0_node, this0_actors0_node_movies0_node
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node), properties: { old: null, new: this0_actors0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this0, this0_actors0_node
            MERGE (this0)<-[this0_actors0_relationship:ACTED_IN]-(this0_actors0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0), id: id(this0_actors0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0 { .* }, relationship: this0_actors0_relationship { .* } } } AS meta, this0, this0_actors0_node
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            WITH this0, this0_meta AS meta
            CALL {
                WITH this0
                MATCH (this0)<-[create_this0:ACTED_IN]-(create_this1:\`Actor\`)
                CALL {
                    WITH create_this1
                    MATCH (create_this1)-[create_this2:ACTED_IN]->(create_this3:\`Movie\`)
                    CALL {
                        WITH create_this3
                        MATCH (create_this3)<-[create_this4:ACTED_IN]-(create_this5:\`Actor\`)
                        WITH create_this5 { .name } AS create_this5
                        RETURN collect(create_this5) AS create_var6
                    }
                    WITH create_this3 { .id, actors: create_var6 } AS create_this3
                    RETURN collect(create_this3) AS create_var7
                }
                WITH create_this1 { .name, movies: create_var7 } AS create_this1
                RETURN collect(create_this1) AS create_var8
            }
            RETURN [ this0 { .id, actors: create_var8 } ] AS data, meta"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_id\\": \\"1\\",
                \\"this0_actors0_node_name\\": \\"Andrés\\",
                \\"this0_actors0_node_movies0_node_id\\": \\"6\\",
                \\"this0_actors0_node_movies0_node_actors0_node_name\\": \\"Thomas\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Multi Create with nested", async () => {
        const query = gql`
            mutation {
                createMovies(
                    input: [
                        {
                            id: "1"
                            actors: { create: { node: { name: "Andrés", movies: { create: { node: { id: 6 } } } } } }
                        }
                        {
                            id: "2"
                            actors: { create: { node: { name: "Darrell", movies: { create: { node: { id: 8 } } } } } }
                        }
                    ]
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.id = $this0_id
            CREATE (this0_actors0_node:Actor)
            SET this0_actors0_node.name = $this0_actors0_node_name
            CREATE (this0_actors0_node_movies0_node:Movie)
            SET this0_actors0_node_movies0_node.id = $this0_actors0_node_movies0_node_id
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node_movies0_node), properties: { old: null, new: this0_actors0_node_movies0_node { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0, this0_actors0_node, this0_actors0_node_movies0_node
            MERGE (this0_actors0_node)-[this0_actors0_node_movies0_relationship:ACTED_IN]->(this0_actors0_node_movies0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0_actors0_node_movies0_node), id: id(this0_actors0_node_movies0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0_actors0_node_movies0_node { .* }, relationship: this0_actors0_node_movies0_relationship { .* } } } AS meta, this0, this0_actors0_node, this0_actors0_node_movies0_node
            WITH meta + { event: \\"create\\", id: id(this0_actors0_node), properties: { old: null, new: this0_actors0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this0, this0_actors0_node
            MERGE (this0)<-[this0_actors0_relationship:ACTED_IN]-(this0_actors0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this0_actors0_node), id_to: id(this0), id: id(this0_actors0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this0_actors0_node { .* }, to: this0 { .* }, relationship: this0_actors0_relationship { .* } } } AS meta, this0, this0_actors0_node
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            CALL {
            WITH [] AS meta
            CREATE (this1:Movie)
            SET this1.id = $this1_id
            CREATE (this1_actors0_node:Actor)
            SET this1_actors0_node.name = $this1_actors0_node_name
            CREATE (this1_actors0_node_movies0_node:Movie)
            SET this1_actors0_node_movies0_node.id = $this1_actors0_node_movies0_node_id
            WITH meta + { event: \\"create\\", id: id(this1_actors0_node_movies0_node), properties: { old: null, new: this1_actors0_node_movies0_node { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this1, this1_actors0_node, this1_actors0_node_movies0_node
            MERGE (this1_actors0_node)-[this1_actors0_node_movies0_relationship:ACTED_IN]->(this1_actors0_node_movies0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this1_actors0_node), id_to: id(this1_actors0_node_movies0_node), id: id(this1_actors0_node_movies0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this1_actors0_node { .* }, to: this1_actors0_node_movies0_node { .* }, relationship: this1_actors0_node_movies0_relationship { .* } } } AS meta, this1, this1_actors0_node, this1_actors0_node_movies0_node
            WITH meta + { event: \\"create\\", id: id(this1_actors0_node), properties: { old: null, new: this1_actors0_node { .* } }, timestamp: timestamp(), typename: \\"Actor\\" } AS meta, this1, this1_actors0_node
            MERGE (this1)<-[this1_actors0_relationship:ACTED_IN]-(this1_actors0_node)
            WITH meta + { event: \\"create_relationship\\", timestamp: timestamp(), id_from: id(this1_actors0_node), id_to: id(this1), id: id(this1_actors0_relationship), relationshipName: \\"ACTED_IN\\", fromTypename: \\"Actor\\", toTypename: \\"Movie\\", properties: { from: this1_actors0_node { .* }, to: this1 { .* }, relationship: this1_actors0_relationship { .* } } } AS meta, this1, this1_actors0_node
            WITH meta + { event: \\"create\\", id: id(this1), properties: { old: null, new: this1 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this1
            RETURN this1, meta AS this1_meta
            }
            WITH this0, this1, this0_meta + this1_meta AS meta
            RETURN [ this0 { .id }, this1 { .id } ] AS data, meta"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_id\\": \\"1\\",
                \\"this0_actors0_node_name\\": \\"Andrés\\",
                \\"this0_actors0_node_movies0_node_id\\": \\"6\\",
                \\"this1_id\\": \\"2\\",
                \\"this1_actors0_node_name\\": \\"Darrell\\",
                \\"this1_actors0_node_movies0_node_id\\": \\"8\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Simple create without returned data", async () => {
        const query = gql`
            mutation {
                createMovies(input: [{ id: "1" }]) {
                    info {
                        nodesCreated
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            WITH [] AS meta
            CREATE (this0:Movie)
            SET this0.id = $this0_id
            WITH meta + { event: \\"create\\", id: id(this0), properties: { old: null, new: this0 { .* } }, timestamp: timestamp(), typename: \\"Movie\\" } AS meta, this0
            RETURN this0, meta AS this0_meta
            }
            WITH this0, this0_meta AS meta
            RETURN meta"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_id\\": \\"1\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });
});
