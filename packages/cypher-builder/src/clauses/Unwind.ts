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

import type { CypherEnvironment } from "../Environment";
import type { ProjectionColumn } from "./sub-clauses/Projection";
import { Projection } from "./sub-clauses/Projection";
import { compileCypherIfExists } from "../utils/compile-cypher-if-exists";
import { Clause } from "./Clause";
import { WithWith } from "./mixins/WithWith";
import { mixin } from "./utils/mixin";
import { WithDelete } from "./mixins/WithDelete";

export interface Unwind extends WithWith, WithDelete {}

/**
 * @see [Cypher Documentation](https://neo4j.com/docs/cypher-manual/current/clauses/unwind/)
 * @group Clauses
 */
@mixin(WithWith, WithDelete)
export class Unwind extends Clause {
    private projection: Projection;

    constructor(...columns: Array<ProjectionColumn>) {
        super();
        this.projection = new Projection(columns);
    }

    public addColumns(...columns: Array<"*" | ProjectionColumn>): void {
        this.projection.addColumns(columns);
    }

    /** @internal */
    public getCypher(env: CypherEnvironment): string {
        const projectionStr = this.projection.getCypher(env);
        const withStr = compileCypherIfExists(this.withStatement, env, { prefix: "\n" });
        const deleteStr = compileCypherIfExists(this.deleteClause, env, { prefix: "\n" });
        return `UNWIND ${projectionStr}${deleteStr}${withStr}`;
    }
}
