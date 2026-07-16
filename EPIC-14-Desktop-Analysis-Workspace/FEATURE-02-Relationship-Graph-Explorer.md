# FEATURE-02 — Relationship Graph Explorer

## Epic
EPIC-14 — Desktop Analysis Workspace

---

# 1. Objective

Let users visually explore the knowledge graph of people, companies, sessions, and topics on desktop, so they can understand their network, find connectors, and trace how relationships formed.

---

# 2. Problem Statement

The relationship graph is too dense and information-rich to be usable on a phone screen; users have no way to see network structure, identify key connectors, or trace multi-hop introduction paths, so the value of the underlying knowledge graph (EPIC-06) stays invisible.

---

# 3. Feature Overview

An interactive, force-directed graph canvas rendering people, companies, sessions, and topics as nodes with typed relationship edges (met_at, introduced_by, discussed, spoke_at). Users can filter, zoom, select nodes for detail, and query shortest paths between two contacts.

---

# 4. Key Functionalities

## Interactive graph canvas
Force-directed layout with pan, zoom, and node dragging for ad-hoc exploration of the relationship network.

## Entity and relationship filtering
Filter the visible graph by entity type, conference, date range, or relationship type to reduce clutter.

## Path finding between contacts
Query the shortest connection path between the user and a target contact, surfacing intermediate introducers.

## Node detail panel
Selecting a node opens a side panel with full entity details, linked sessions, and recent interaction history.

## Connector and cluster highlighting
Surface high-degree "connector" nodes and visually cluster tightly-connected communities within the graph.

---

# 5. Primary Use Cases

## Use Case 1
An investor exploring their network finds who introduced them to a founder they met at a chance encounter.

## Use Case 2
A sales lead searches for the shortest path from themselves to a target executive via mutual contacts before reaching out.

## Use Case 3
A user filters the graph to one conference to identify the most-connected "super-connector" attendees worth following up with.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to visually explore my relationship graph on my Mac,
so that I can understand how my contacts connect to each other and to me.

### Acceptance Criteria
- User can open the graph explorer and see nodes for their contacts, companies, sessions, and topics.
- User can filter the graph by conference, date range, and relationship type.
- Selecting any node shows its full detail panel with linked interactions.

## User Story 2
As a power user,
I want to find the shortest introduction path to a target contact,
so that I can identify the best person to ask for a warm introduction.

### Acceptance Criteria
- User can search for a target contact and request a path from themselves to that contact.
- The system returns the shortest path with all intermediate nodes and relationship types labeled.
- If no path exists, the user receives a clear "no connection found" result rather than an error.

---

# 7. User Workflow

1. User opens Relationship Graph Explorer from the desktop dashboard.
2. Default view loads the user's full network graph, capped to a manageable node count.
3. User applies filters (conference, date range, entity type) to narrow the view.
4. User pans/zooms and clicks nodes to inspect details.
5. User optionally runs a path query between themselves and a target contact.
6. User can save the current filtered view for quick return later.
7. User navigates from a node's detail panel directly into related transcripts or contact profiles.

---

# 8. UI / UX Requirements

- Smooth pan/zoom/drag interactions at interactive frame rates.
- Legend distinguishing entity types (person, company, session, topic) by color/shape.
- Search bar to jump directly to a named node.
- Collapsible filter sidebar and node detail panel.
- Visual distinction for high-degree "connector" nodes.
- Loading/skeleton state while large graphs render.

---

# 9. Technical Requirements

## Frontend
SwiftUI shell hosting a Metal- or Canvas-accelerated force-directed graph renderer capable of handling thousands of nodes with level-of-detail rendering (labels fade out when zoomed out, node clustering at low zoom).

## Backend
Graph queries (node fetch, edge fetch, shortest-path) are served by desktop-facing endpoints backed by the graph database maintained by EPIC-06, with pagination/windowing for large result sets.

## AI/ML
No new inference; consumes existing entity resolution, relationship scoring, and connector/community-detection outputs already computed by the Knowledge Graph Platform.

## Infrastructure
Node/edge data is cached locally per saved view to keep re-opening a view fast; live updates are pushed via the desktop sync channel when the underlying graph changes.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `GET /desktop/graph/nodes` | Fetch nodes for the current filter/viewport |
| `GET /desktop/graph/edges` | Fetch relationship edges for visible nodes |
| `GET /desktop/graph/path?from={id}&to={id}` | Compute shortest path between two entities |
| `POST /desktop/graph/views` | Save a named, filtered graph view |
| Knowledge Graph Platform (EPIC-06) | Source of entities, relationships, and scoring |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| GraphViewState | id, user_id, filter_config, layout_seed, saved_view_name, created_at, last_opened_at |
| GraphNodeCache | node_id, entity_type, label, degree, cluster_id, last_synced_at |
| GraphPathQuery | id, user_id, from_node_id, to_node_id, path_result_json, computed_at |

---

# 12. Security & Privacy

- Graph queries are scoped to entities the requesting user has visibility into; no cross-user graph traversal.
- Node detail panels respect the same field-level privacy rules as contact profiles elsewhere in the product.
- Saved views store only filter configuration, not denormalized personal data.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Initial render (up to 2,000 nodes) | <2 sec |
| Pan/zoom frame rate | ≥60 fps |
| Shortest-path query | <500 ms |
| Filter re-apply on cached view | <300 ms |

---

# 14. Edge Cases

- Graph exceeds 10,000 visible nodes, causing rendering lag or an unreadable "hairball."
- Disconnected subgraphs with no path between two otherwise valid nodes.
- A node representing an entity pending duplicate-merge resolution appears twice.
- Path query between two nodes with multiple equally-short paths.
- Underlying graph updates (new interaction logged from mobile) while a view is open.
- User filters to a criteria combination that returns zero nodes.

---

# 15. Dependencies

- EPIC-06 Knowledge Graph Platform (nodes, edges, scoring, community detection)
- EPIC-04 Contact & Relationship Intelligence (entity resolution feeding node identity)
- Desktop authentication and sync service
- Rendering framework capable of GPU-accelerated 2D graph layout

---

# 16. Risks

- Rendering performance degrading unacceptably on very high-degree networks for prolific networkers.
- Force-directed layouts producing visually unstable graphs that reflow confusingly on filter changes.
- Users misinterpreting relationship strength/scoring visualized without sufficient context.

---

# 17. Telemetry & Analytics

Track:
- `graph_view_opened`
- `node_selected`
- `filter_applied`
- `path_query_run`
- `path_query_no_result`
- `graph_view_saved`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Graph explorer weekly active usage among desktop users | >40% |
| Path queries returning a usable result | >80% |
| Median initial render time | <2 sec |
| Saved views created per active user | ≥1 |

---

# 19. Future Enhancements

- Timeline scrubber to animate network growth over time.
- Suggested introduction paths ranked by relationship strength, not just hop count.
- Export graph view as a shareable image or interactive link.

---

# 20. Open Questions

- What is the maximum node count the desktop client should attempt to render live versus requiring further filtering?
- Should connector/community detection be recomputed on-demand or rely entirely on EPIC-06's precomputed scores?
- How should the UI represent relationship confidence/strength visually without overwhelming the graph?
