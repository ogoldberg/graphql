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

// Clauses
export { Match, OptionalMatch } from "./clauses/Match";
export { Create } from "./clauses/Create";
export { Merge } from "./clauses/Merge";
export { Call } from "./clauses/Call";
export { Use } from "./clauses/Use";
export { Return } from "./clauses/Return";
export { RawCypher } from "./clauses/RawCypher";
export { With } from "./clauses/With";
export { Unwind } from "./clauses/Unwind";
export { Union } from "./clauses/Union";
export { Foreach } from "./clauses/Foreach";

export { concat } from "./clauses/utils/concat";

// Patterns
export { Pattern } from "./pattern/Pattern";

// Variables and references
export { NodeRef as Node, NamedNode } from "./references/NodeRef";
export { RelationshipRef as Relationship } from "./references/RelationshipRef";
export { Param, NamedParam } from "./references/Param";
export { NamedVariable, Variable } from "./references/Variable";
export { Literal, CypherNull as Null } from "./references/Literal";
export { Path, NamedPath } from "./references/Path";
export { PropertyRef as Property } from "./references/PropertyRef";

// Expressions
export { Exists } from "./expressions/Exists";
export { Case } from "./expressions/Case";

// --Apoc
export * as apoc from "./apoc/apoc";

// --Lists
export { ListComprehension } from "./expressions/list/ListComprehension";
export { PatternComprehension } from "./expressions/list/PatternComprehension";
export { ListExpr as List } from "./expressions/list/ListExpr";

// --Map
export { MapExpr as Map } from "./expressions/map/MapExpr";
export { MapProjection } from "./expressions/map/MapProjection";

// --Operations
export { or, and, not, xor } from "./expressions/operations/boolean";
export {
    eq,
    neq,
    gt,
    gte,
    lt,
    lte,
    isNull,
    isNotNull,
    inOp as in,
    contains,
    startsWith,
    endsWith,
    matches,
} from "./expressions/operations/comparison";
export { plus, minus, divide, multiply, mod, pow } from "./expressions/operations/math";

// --Functions
export { CypherFunction as Function } from "./expressions/functions/CypherFunctions";

export {
    coalesce,
    point,
    distance,
    pointDistance,
    labels,
    randomUUID,
    id,
    elementId,
} from "./expressions/functions/CypherFunctions";

export { count, min, max, avg, sum, collect } from "./expressions/functions/AggregationFunctions";

export {
    cypherDatetime as datetime,
    cypherDate as date,
    cypherLocalTime as localtime,
    cypherLocalDatetime as localdatetime,
    cypherTime as time,
} from "./expressions/functions/TemporalFunctions";

export * from "./expressions/functions/StringFunctions";
export * from "./expressions/functions/ListFunctions";

export * from "./expressions/functions/PathFunctions";

export { any, all, exists, single } from "./expressions/functions/PredicateFunctions";

// Procedures
export { CypherProcedure as Procedure, VoidCypherProcedure as VoidProcedure } from "./procedures/CypherProcedure";

export * as db from "./procedures/db";

// Types
export type { CypherResult } from "./types";
export type { Clause } from "./clauses/Clause";
export type { CypherEnvironment as Environment } from "./Environment";
export type { ComparisonOp } from "./expressions/operations/comparison";
export type { BooleanOp } from "./expressions/operations/boolean";
export type { Expr, Predicate, Operation } from "./types";
export type { Yield } from "./procedures/Yield";
export type { ProjectionColumn } from "./clauses/sub-clauses/Projection";
export type { SetParam } from "./clauses/sub-clauses/Set";
export type { PredicateFunction } from "./expressions/functions/PredicateFunctions";
export type { Order } from "./clauses/sub-clauses/OrderBy";
export type { CompositeClause } from "./clauses/utils/concat";
export type { CypherAggregationFunction as AggregationFunction } from "./expressions/functions/AggregationFunctions";

// utils
export * as utils from "./utils/utils";
