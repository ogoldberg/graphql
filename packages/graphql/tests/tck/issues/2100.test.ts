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
import { Neo4jGraphQL } from "../../../src";
import { formatCypher, translateQuery, formatParams } from "../utils/tck-test-utils";

describe("https://github.com/neo4j/graphql/issues/2100", () => {
    let typeDefs: DocumentNode;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = gql`
            type ServiceLog {
                id: ID
                records: [Record!]! @relationship(type: "HAS_BUSSING", direction: OUT)
            }
            type BussingRecord implements Record {
                id: ID!
                attendance: Int
                markedAttendance: Boolean!
                    @cypher(
                        statement: """
                        MATCH (this)<-[:PRESENT_AT_SERVICE|ABSENT_FROM_SERVICE]-(member:Member)
                        RETURN COUNT(member) > 0 AS markedAttendance
                        """
                    )
                serviceDate: TimeGraph! @relationship(type: "BUSSED_ON", direction: OUT)
            }

            interface Church @auth(rules: [{ isAuthenticated: true }]) {
                id: ID @id
                name: String!
                serviceLogs: [ServiceLog!]! @relationship(type: "HAS_HISTORY", direction: OUT)
            }

            type Bacenta implements Church {
                id: ID @id
                name: String!
                serviceLogs: [ServiceLog!]! @relationship(type: "HAS_HISTORY", direction: OUT)
                bussing(limit: Int!): [BussingRecord!]!
                    @cypher(
                        statement: """
                        MATCH (this)-[:HAS_HISTORY]->(:ServiceLog)-[:HAS_BUSSING]->(records:BussingRecord)-[:BUSSED_ON]->(date:TimeGraph)
                        WITH DISTINCT records, date LIMIT $limit
                        RETURN records ORDER BY date.date DESC
                        """
                    )
            }

            type TimeGraph @auth(rules: [{ isAuthenticated: true }]) {
                date: Date
            }

            interface Record {
                id: ID!
                attendance: Int
                markedAttendance: Boolean!
                    @cypher(
                        statement: """
                        MATCH (this)<-[:PRESENT_AT_SERVICE|ABSENT_FROM_SERVICE]-(member:Member)
                        RETURN COUNT(member) > 0 AS markedAttendance
                        """
                    )
                serviceDate: TimeGraph! @relationship(type: "BUSSED_ON", direction: OUT)
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
        });
    });

    test("query nested relations under a root connection field", async () => {
        const query = gql`
            query {
                bacentas(where: { id: 1 }) {
                    id
                    name
                    bussing(limit: 10) {
                        id
                        attendance
                        markedAttendance
                        serviceDate {
                            date
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
            }
        `;
        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Bacenta\`)
            WHERE (this.id = $param0 AND apoc.util.validatePredicate(NOT (apoc.util.validatePredicate(NOT ($auth.isAuthenticated = true), \\"@neo4j/graphql/UNAUTHENTICATED\\", [0])), \\"@neo4j/graphql/FORBIDDEN\\", [0]))
            CALL {
                WITH this
                UNWIND apoc.cypher.runFirstColumnMany(\\"MATCH (this)-[:HAS_HISTORY]->(:ServiceLog)-[:HAS_BUSSING]->(records:BussingRecord)-[:BUSSED_ON]->(date:TimeGraph)
                WITH DISTINCT records, date LIMIT $limit
                RETURN records ORDER BY date.date DESC\\", { limit: $param2, this: this, auth: $auth }) AS this0
                CALL {
                    WITH this0
                    UNWIND apoc.cypher.runFirstColumnSingle(\\"MATCH (this)<-[:PRESENT_AT_SERVICE|ABSENT_FROM_SERVICE]-(member:Member)
                    RETURN COUNT(member) > 0 AS markedAttendance\\", { this: this0, auth: $auth }) AS this1
                    RETURN head(collect(this1)) AS this1
                }
                CALL {
                    WITH this0
                    MATCH (this0)-[this2:BUSSED_ON]->(this3:\`TimeGraph\`)
                    WHERE apoc.util.validatePredicate(NOT (apoc.util.validatePredicate(NOT ($auth.isAuthenticated = true), \\"@neo4j/graphql/UNAUTHENTICATED\\", [0])), \\"@neo4j/graphql/FORBIDDEN\\", [0])
                    WITH this3 { .date } AS this3
                    RETURN head(collect(this3)) AS var4
                }
                RETURN collect(this0 { .id, .attendance, markedAttendance: this1, serviceDate: var4 }) AS this0
            }
            RETURN this { .id, .name, bussing: this0 } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"param2\\": {
                    \\"low\\": 10,
                    \\"high\\": 0
                },
                \\"auth\\": {
                    \\"isAuthenticated\\": false,
                    \\"roles\\": []
                }
            }"
        `);
    });
});
