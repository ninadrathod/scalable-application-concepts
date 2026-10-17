/* =============================================================================
 * ScaleCraft — course runtime
 * -----------------------------------------------------------------------------
 *  1. COURSE_MODULES   module registry (drives the row, sidebar, placeholders)
 *  2. QUIZ_BANK        question objects per module (answer + 3 distractors)
 *  3. Store            localStorage wrapper (fails safely in private mode)
 *  4. Quiz engine      balanced option shuffling + rendering + scoring
 *  5. Navigation       module row, sidebar TOC, mobile drawer, scrollspy
 *  6. Progress         per-subsection reading + quiz completion
 *  7. Widgets          tabs, copy buttons, latency chart, calculators, stepper
 *
 *  To add a module: flip its status to 'ready', add its <article> to
 *  index.html (same markup pattern as m0/m1), and add QUIZ_BANK.<id>.
 * ========================================================================== */

'use strict';

/* ---------------------------------------------------------------------------
 * 1. COURSE_MODULES
 * ------------------------------------------------------------------------ */
const COURSE_MODULES = [
  { id: 'm0', number: '00', title: 'Prerequisites & Environment Setup', short: 'Prerequisites', duration: '75 min', status: 'ready',
    blurb: 'How a web request works, the numbers that matter, CLI essentials, and your Docker-based scale-lab.' },
  { id: 'm1', number: '01', title: 'Foundations of Scale', short: 'Foundations', duration: '100 min', status: 'ready',
    blurb: 'Percentiles, queueing, Little’s Law, scaling laws, statelessness, availability and capacity planning.' },
  { id: 'm2', number: '02', title: 'Load Balancing & Reverse Proxies', short: 'Load Balancing', duration: '85 min', status: 'ready',
    blurb: 'Spreading traffic across replicas without dropping a request.',
    topics: ['DNS & GeoDNS load balancing', 'L4 vs L7 balancers', 'Round-robin, least-connections, consistent hashing', 'Health checks & connection draining', 'TLS termination, Nginx/HAProxy/Envoy'] },
  { id: 'm3', number: '03', title: 'Caching at Every Layer', short: 'Caching', duration: '95 min', status: 'ready',
    blurb: 'Browser, CDN, application and database caches — and keeping them correct.',
    topics: ['HTTP caching headers & ETags', 'CDNs and edge caching', 'Cache-aside, read/write-through, write-behind', 'Eviction (LRU/LFU) & TTL design', 'Invalidation, stampedes & hot keys'] },
  { id: 'm4', number: '04', title: 'Scaling the Database', short: 'Databases', duration: '110 min', status: 'ready',
    blurb: 'Indexes, replication, partitioning and sharding — scaling the stateful core.',
    topics: ['Indexes, query plans & N+1', 'Connection pooling (PgBouncer)', 'Read replicas & replication lag', 'Partitioning and sharding strategies', 'CAP, PACELC & consistency models', 'SQL vs NoSQL trade-offs'] },
  { id: 'm5', number: '05', title: 'Asynchronous Processing: Queues & Streams', short: 'Queues & Streams', duration: '90 min', status: 'ready',
    blurb: 'Decoupling work in time with message queues, workers and event logs.',
    topics: ['Queues vs pub/sub vs logs', 'RabbitMQ, SQS and Kafka', 'At-least-once delivery & idempotent consumers', 'Back-pressure & dead-letter queues', 'Outbox pattern & event-driven design'] },
  { id: 'm6', number: '06', title: 'Service Architecture & APIs', short: 'Services & APIs', duration: '80 min', status: 'ready',
    blurb: 'Monoliths, microservices and how services talk at scale.',
    topics: ['Modular monolith vs microservices', 'REST, gRPC & GraphQL at scale', 'API gateways & service discovery', 'Pagination, versioning & idempotency keys', 'Sagas & distributed transactions'] },
  { id: 'm7', number: '07', title: 'Frontend Performance at Scale', short: 'Frontend', duration: '75 min', status: 'ready',
    blurb: 'Making the browser side fast for millions of devices.',
    topics: ['Core Web Vitals', 'Bundling, code splitting & compression', 'SSR, SSG, ISR and edge rendering', 'Images, fonts & critical rendering path', 'Service workers & offline caching'] },
  { id: 'm8', number: '08', title: 'Containers, Orchestration & Autoscaling', short: 'Containers & K8s', duration: '100 min', status: 'ready',
    blurb: 'Packaging, scheduling and automatically resizing your fleet.',
    topics: ['Images, layers & 12-factor apps', 'Kubernetes core objects', 'Horizontal & vertical pod autoscaling', 'Rolling, blue-green & canary deploys', 'Serverless and its scaling model'] },
  { id: 'm9', number: '09', title: 'Observability: Logs, Metrics & Traces', short: 'Observability', duration: '80 min', status: 'ready',
    blurb: 'Seeing inside a distributed system when it misbehaves.',
    topics: ['Structured logging', 'Metrics, histograms & Prometheus', 'Distributed tracing & OpenTelemetry', 'SLO-based alerting', 'Load testing & capacity reviews'] },
  { id: 'm10', number: '10', title: 'Resilience Engineering', short: 'Resilience', duration: '90 min', status: 'ready',
    blurb: 'Staying up when dependencies fail and traffic spikes.',
    topics: ['Timeouts, retries, backoff & jitter', 'Circuit breakers & bulkheads', 'Rate limiting algorithms', 'Load shedding & graceful degradation', 'Multi-AZ, multi-region & chaos engineering'] },
  { id: 'm11', number: '11', title: 'Security at Scale', short: 'Security', duration: '65 min', status: 'ready',
    blurb: 'Protecting a large, public, distributed surface area.',
    topics: ['DDoS mitigation & WAFs', 'AuthN/AuthZ across services', 'Secrets management', 'Zero-trust networking & mTLS', 'Abuse and bot protection'] },
  { id: 'm12', number: '12', title: 'Capstone: Designing a Production System', short: 'Capstone', duration: '90 min', status: 'ready',
    blurb: 'Putting it all together in an end-to-end system design.',
    topics: ['Requirements & estimates', 'High-level architecture', 'Deep dives & bottlenecks', 'Failure modes & runbooks', 'Cost and evolution plan'] }
];

/* ---------------------------------------------------------------------------
 * 2. QUIZ_BANK
 *    Author every question with the correct `answer` and three `distractors`.
 *    Positions are assigned at render time (see buildQuiz) so correct answers
 *    are spread evenly across A–D. Question/explanation strings may hold HTML.
 * ------------------------------------------------------------------------ */
const QUIZ_BANK = {
  m0: [
    {
      q: 'What is the primary job of DNS in the life of a web request?',
      answer: 'Mapping a domain name to an IP address',
      distractors: ['Encrypting traffic between the browser and the server', 'Guaranteeing that packets arrive in order and without loss', 'Storing session data for users who are logged in'],
      explain: 'Routers move packets using IP addresses. DNS resolves names like <code>shop.example.com</code> to <code>A</code>/<code>AAAA</code> records. Encryption is TLS’s job, reliable ordered delivery is TCP’s job, and sessions live in your application or a session store.'
    },
    {
      q: 'You point your domain’s A record at a new server. Hours later, some users still reach the old server. What is the most likely cause?',
      answer: 'Caches kept the old record until its TTL expired',
      distractors: ['The TLS certificate on the new server has not been renewed', 'The load balancer is configured with sticky sessions', 'HTTP/2 multiplexing keeps sending requests to old streams'],
      explain: 'Every DNS answer carries a TTL that tells caches how long they may reuse it. Until it expires, recursive resolvers, operating systems and browsers keep returning the old IP. Teams lower TTLs <em>before</em> a planned migration for exactly this reason.'
    },
    {
      q: 'A browser opens a brand-new HTTPS connection (TCP + TLS 1.3) to a server with a 100 ms round-trip time. Ignoring DNS and server processing, roughly how long until the first byte of the response arrives?',
      answer: 'About 300 ms — one round trip each for TCP, TLS and HTTP',
      distractors: ['About 100 ms — the handshakes overlap with the request', 'About 50 ms — only a one-way trip to the server is required', 'About 600 ms — every step needs two full round trips'],
      explain: 'The TCP three-way handshake costs 1 RTT, the TLS 1.3 handshake costs another, and the HTTP request/response a third: ≈ 3 × 100 ms. This is why CDNs (shorter RTT), keep-alive (handshake once) and HTTP/3 (merged handshakes) matter so much.'
    },
    {
      q: 'What is the main latency improvement HTTP/3 brings over HTTP/2?',
      answer: 'It uses QUIC over UDP, merging transport and TLS handshakes',
      distractors: ['It replaces DNS lookups with a faster built-in name resolution step', 'It removes the need for TLS encryption, saving a full handshake', 'It forces every response to be cached at the nearest CDN edge'],
      explain: 'QUIC combines the connection and TLS 1.3 handshakes into one round trip (and supports 0-RTT resumption), and avoids TCP head-of-line blocking. Encryption is mandatory in QUIC, not removed.'
    },
    {
      q: 'Which HTTP method is <em>not</em> idempotent by default, making blind automatic retries risky?',
      answer: 'POST',
      distractors: ['GET', 'PUT', 'DELETE'],
      explain: 'Repeating a <code>POST</code> (e.g. “create order”) can create duplicates or double-charge. <code>GET</code> is safe, and <code>PUT</code>/<code>DELETE</code> are idempotent: doing them twice leaves the same end state. APIs make POST retry-safe with idempotency keys.'
    },
    {
      q: 'Your users see a burst of <code>502</code> and <code>504</code> responses. What do these status codes usually indicate?',
      answer: 'An upstream server failed or was too slow to answer the proxy',
      distractors: ['The client sent a malformed request that the server could not parse', 'The client exceeded its rate limit and must slow down', 'The requested resource has moved permanently to a new URL'],
      explain: '502 Bad Gateway and 504 Gateway Timeout are emitted by an intermediary (Nginx, a cloud LB) when the upstream app crashed, refused the connection, or was too slow — classic signs of overload. Malformed requests are 400, rate limiting is 429, permanent moves are 301/308.'
    },
    {
      q: 'Which of these operations is typically the <strong>slowest</strong>?',
      answer: 'A network round trip within the same data center',
      distractors: ['A main-memory (RAM) reference', 'Compressing 1 KB of data with a fast compression codec', 'Acquiring and releasing an uncontended mutex lock'],
      explain: 'Approximate figures: mutex ~25 ns, RAM ~100 ns, compressing 1 KB with a fast codec ~2 µs, same-datacenter round trip ~500 µs. Network hops dominate — which is why chatty services and N+1 queries hurt.'
    },
    {
      q: 'Why can no software optimization make a round trip between New York and London faster than roughly 55–60 ms?',
      answer: 'The speed of light in fiber sets a physical lower bound',
      distractors: ['TCP congestion control caps the speed of every transatlantic link', 'DNS resolution always adds about that much time to each request', 'TLS 1.3 requires two round trips before any data can flow'],
      explain: 'Light in fiber travels ~200,000 km/s. ~5,600 km each way means ~56 ms of pure propagation for a round trip, before any routing overhead. The only fix is to move data closer to users: CDNs, edge compute, multi-region deployments.'
    },
    {
      q: 'Roughly how many requests per second is 1 million requests per day, on average?',
      answer: 'About 12 per second',
      distractors: ['About 1,200 per second', 'About 120 per second', 'About 1 per second'],
      explain: '1,000,000 ÷ 86,400 ≈ 11.6. Memorize it: 1 M/day ≈ 12 RPS. Then remember that real traffic is bursty — peaks are commonly 2–10× the daily average.'
    },
    {
      q: 'An endpoint was fast at launch but now takes seconds; the underlying table has grown to 50 million rows. What best explains this?',
      answer: 'An O(n) full table scan whose cost grew with the data',
      distractors: ['O(1) lookups get gradually slower as tables grow larger', 'Network latency inside the data center grows linearly with table size', 'Big-O analysis does not apply to queries executed by a database'],
      explain: 'A full table scan is O(n): fine at 1,000 rows, catastrophic at 50 million. A B-tree index turns it into O(log n) — about 26 comparisons for 50 M rows. Many “scaling problems” are just an O(n) operation that used to have a small n.'
    },
    {
      q: 'A busy proxy starts failing with <code>EMFILE: too many open files</code> while its CPU sits at 20%. What happened?',
      answer: 'It hit the open file-descriptor limit; each socket uses one',
      distractors: ['The disk is full, so no more log files can be written to it', 'The CPU is saturated but the metric is sampled incorrectly', 'DNS resolution failed for one of the upstream servers'],
      explain: 'On Unix, sockets are file descriptors. Many distributions default to a soft limit of 1,024 per process, so a proxy with thousands of connections hits the wall long before CPU is the problem. Raise it with <code>ulimit -n</code> / systemd <code>LimitNOFILE</code>.'
    },
    {
      q: 'In the highway analogy, adding more lanes directly increases which property?',
      answer: 'Bandwidth — the maximum capacity of the pipe',
      distractors: ['Latency — each individual car now arrives sooner', 'Utilization — every lane becomes busier than before', 'Idempotency — cars can safely repeat the same trip'],
      explain: 'More lanes means more capacity (bandwidth). A single car’s trip time (latency) is governed by distance and speed limit. Actual cars per hour (throughput) may rise if the road was congested — but bandwidth is what you added.'
    },
    {
      q: 'Why does the scale-lab <code>docker-compose.yml</code> limit each app container to <code>cpus: "1.0"</code>?',
      answer: 'To mimic a small CPU-capped server so scaling effects show',
      distractors: ['Because Docker Compose refuses to start containers without CPU limits', 'To speed up image builds by reserving a dedicated core', 'To block the containers from accessing the network'],
      explain: 'The limit is enforced with Linux cgroups. Without it, a single container could use every core on your laptop and hide the saturation and queueing effects the labs are designed to show.'
    },
    {
      q: 'Why does the lab app use a database connection <strong>pool</strong> instead of opening a connection per request?',
      answer: 'New connections are costly and the DB can only serve so many',
      distractors: ['Connection pools automatically encrypt every SQL query', 'Pools cache query results so the database is queried far less often', 'The SQL standard requires all clients to use a pool'],
      explain: 'Each new PostgreSQL connection requires TCP (+TLS) handshakes, authentication and a dedicated server process with its own memory. Reusing a small fixed set of connections removes that per-request cost and protects the database from being flooded.'
    },
    {
      q: 'In a k6 summary, which metric represents your <strong>throughput</strong>?',
      answer: '<code>http_reqs</code> per second',
      distractors: ['<code>vus_max</code>', '<code>http_req_duration</code> p(95)', '<code>http_req_failed</code>'],
      explain: 'Throughput is completed requests per unit time — <code>http_reqs</code>/s. <code>vus_max</code> is the number of virtual users (concurrency), <code>http_req_duration</code> is latency, and <code>http_req_failed</code> is the error rate.'
    },
    {
      q: 'What is the main reason to record a <strong>baseline</strong> load test before optimizing?',
      answer: 'It gives a reference to measure every later change against',
      distractors: ['Docker needs a warm-up run before containers can serve traffic', 'It permanently warms every cache in the system', 'It makes the production environment faster automatically'],
      explain: 'Without a baseline you cannot tell whether a change helped, hurt, or did nothing. Measure, change one thing, measure again — that loop is the core of performance engineering.'
    },
    {
      q: 'On Windows with WSL 2, why should the lab code live in <code>~/scale-lab</code> rather than under <code>/mnt/c</code>?',
      answer: 'I/O across the Windows/Linux boundary is far slower',
      distractors: ['Docker cannot read files stored on Windows drives at all', 'Node.js cannot be installed on Windows systems', 'Git refuses to operate on files under /mnt/c'],
      explain: 'Accessing Windows files from WSL goes through a translation layer that is much slower than the native Linux filesystem. It works, but builds, installs and file watching become painfully slow.'
    },
    {
      q: 'What is the primary scaling benefit of a CDN?',
      answer: 'Serving content near users, cutting RTT and origin load',
      distractors: ['Making database writes faster through edge replication', 'Removing the need for any load balancer in front of the origin', 'Guaranteeing strong consistency for all cached data'],
      explain: 'CDN edges sit close to users, so connections and cached responses travel shorter distances, and most requests never reach your servers at all. CDNs do not speed up database writes or provide strong consistency.'
    },
    {
      q: 'What does HTTP keep-alive (persistent connections) achieve?',
      answer: 'It reuses one connection for many requests, skipping handshakes',
      distractors: ['It restarts the server process automatically after a crash', 'It periodically pings logged-in users so their sessions never expire', 'It prevents DNS records from expiring in the browser cache'],
      explain: 'Without keep-alive, every request pays TCP (and TLS) handshakes. Persistent connections — and HTTP/2 multiplexing over a single connection — amortize that cost. Nginx’s <code>keepalive</code> directive does the same between the proxy and app servers.'
    },
    {
      q: 'Why do Kafka and many database storage engines favor append-only, sequential writes?',
      answer: 'Sequential I/O is dramatically faster than random I/O',
      distractors: ['Append-only files are automatically encrypted when written to disk', 'SSDs do not permit random writes of any kind', 'Sequential writes consume less RAM than random ones'],
      explain: 'Sequential access avoids seeks on spinning disks and plays well with SSD internals and OS read-ahead. Log-structured designs (Kafka, LSM-trees, write-ahead logs) are built around this property.'
    },
    {
      q: 'Which architecture contains a <strong>single point of failure</strong>?',
      answer: 'Three app servers behind one load balancer that has no standby',
      distractors: ['Two load balancers in active/passive mode in front of three app servers', 'Three app servers spread across two availability zones with a redundant LB pair', 'A primary database with an automatically promoted standby replica'],
      explain: 'The lone load balancer is a SPOF: if it fails, every app server becomes unreachable even though they are healthy. Redundancy only helps if every layer on the request path has it.'
    }
  ],

  m1: [
    {
      q: 'Which definition of a <strong>scalable</strong> system is most accurate?',
      answer: 'Adding resources lets it serve more load at acceptable cost and speed',
      distractors: ['It responds in under 100 ms to every single request, regardless of how much load it is under', 'It never experiences failures of any kind in production', 'It runs on the largest single machine a provider offers'],
      explain: 'Scalability is about how the system responds to growth: add resources, keep performance acceptable, keep cost per unit of load roughly flat. Fast, never-failing and huge are separate (and sometimes contradictory) properties.'
    },
    {
      q: 'What distinguishes <strong>elasticity</strong> from scalability?',
      answer: 'It adds and removes capacity automatically as load changes',
      distractors: ['Elasticity means the system can survive the loss of a data center', 'Elasticity means latency stays constant at every load level', 'Elasticity means the code can be deployed to any cloud provider'],
      explain: 'A system can be scalable (you <em>can</em> add servers) without being elastic (it does so automatically, and shrinks again when load drops to save cost). Autoscaling groups and Kubernetes HPA provide elasticity.'
    },
    {
      q: 'A celebrity with 50 million followers posts an update. Which load parameter best captures the challenge?',
      answer: 'Fan-out — how much downstream work one action triggers',
      distractors: ['Median (p50) latency of the post-creation request', 'The DNS TTL configured for the API’s domain name', 'Idempotency of the POST endpoint that creates the update'],
      explain: 'One write may need to update 50 M timelines (fan-out on write) or be merged into millions of reads (fan-out on read). Choosing between them — or a hybrid for celebrities — is a classic scaling decision.'
    },
    {
      q: '99 requests take 10 ms and one takes 5,000 ms. Why is the mean (~60 ms) a poor summary?',
      answer: 'It matches no real request: too high for most, and hides the 5 s outlier',
      distractors: ['The mean is mathematically incorrect for any latency data', 'The mean is always lower than the median for latency data', 'The mean automatically ignores the slow request because statistically it counts as an outlier'],
      explain: 'The mean blends very different experiences into one number that matches nobody. Percentiles (p50 = 10 ms, p99+ = 5 s) describe the typical user and the unhappy tail separately.'
    },
    {
      q: 'Your service reports <strong>p95 = 180 ms</strong>. What does that mean?',
      answer: '95% of requests completed in 180 ms or less',
      distractors: ['The average of the slowest 5% of requests was 180 ms', '95% of servers in the fleet responded within 180 ms', 'Requests took 180 ms on average with 95% confidence'],
      explain: 'Sort all latencies: the p95 is the value 95% of the way down. 5% of requests were slower than 180 ms — and those are the ones that generate complaints.'
    },
    {
      q: 'A page load makes 20 independent API calls. Roughly what fraction of page loads include at least one call slower than that API’s p99?',
      answer: 'About 18%',
      distractors: ['About 1%', 'About 50%', 'About 82%'],
      explain: 'P(no slow call) = 0.99<sup>20</sup> ≈ 0.82, so ≈ 18% of page views hit the tail. Per-request p99 becomes a per-page experience for nearly one in five users.'
    },
    {
      q: 'A request fans out to 100 backend servers in parallel and must wait for all of them. What fraction of requests experience at least one server’s p99 latency?',
      answer: 'About 63%',
      distractors: ['About 1%', 'About 10%', 'About 99%'],
      explain: '1 − 0.99<sup>100</sup> ≈ 0.63. With wide fan-out, the tail of each server becomes the common case of the whole request — the “tail at scale” problem that motivates hedged requests.'
    },
    {
      q: 'Server A has p99 = 100 ms and server B has p99 = 300 ms. How do you correctly compute the fleet-wide p99?',
      answer: 'Merge their latency histograms and read p99 from the result',
      distractors: ['Average the two values to get 200 ms', 'Take the larger value, 300 ms, since the fleet p99 can be no better than its worst server', 'Add the values together to get 400 ms'],
      explain: 'Percentiles are not additive or averageable. Histograms (bucket counts) can be summed, so monitoring systems merge histograms and then read percentiles from the result. The true fleet p99 depends on each server’s traffic share and distribution.'
    },
    {
      q: 'What is <strong>coordinated omission</strong> in load testing?',
      answer: 'A closed-loop tool pauses during stalls, under-counting slow requests',
      distractors: ['Two load generators accidentally send identical requests', 'The server omits responses for requests that time out', 'The monitoring agent silently drops metrics whenever CPU utilization is too high'],
      explain: 'If the tool waits for each reply before sending the next request, a 2-second stall produces one slow sample instead of the hundreds real users would have experienced. Open-model tools (k6 arrival-rate executors, wrk2) avoid this.'
    },
    {
      q: 'A service receives <strong>400 req/s</strong> and each request spends <strong>250 ms</strong> in the system. By Little’s Law, how many requests are in flight on average?',
      answer: '100',
      distractors: ['1,600', '400', '25'],
      explain: 'L = λ × W = 400 req/s × 0.25 s = 100 concurrent requests. This tells you how many threads, connections or event-loop slots you need.'
    },
    {
      q: 'An app handles <strong>1,000 req/s</strong> and each request holds a database connection for <strong>20 ms</strong>. On average, how many connections are busy?',
      answer: '20',
      distractors: ['50', '200', '1,000'],
      explain: 'Little’s Law again: 1,000 × 0.020 = 20 busy connections. Add headroom for bursts, divide across instances, and you have your pool size — usually far smaller than people configure.'
    },
    {
      q: 'A consumer processes <strong>200 messages/s</strong> and the queue holds <strong>12,000</strong> messages. Roughly how long will a newly enqueued message wait?',
      answer: 'About 60 seconds',
      distractors: ['About 6 seconds', 'About 600 seconds', 'About 0.6 seconds'],
      explain: 'Rearranging Little’s Law: W = L ÷ λ = 12,000 ÷ 200 = 60 s. Queue depth divided by drain rate is the single most useful queue-health metric.'
    },
    {
      q: 'In the simple M/M/1 queueing model, at <strong>90% utilization</strong> the average response time is how many times the bare service time?',
      answer: '10×',
      distractors: ['1.1×', '2×', '90×'],
      explain: 'W = S / (1 − ρ) = S / 0.1 = 10S. At 50% it is 2×; at 95% it is 20×. That non-linearity is the hockey stick.'
    },
    {
      q: 'Why do teams typically target 50–70% peak utilization for latency-sensitive services instead of ~95%?',
      answer: 'Latency climbs steeply near saturation; headroom absorbs spikes',
      distractors: ['Cloud providers charge a penalty for instances above 70% CPU', 'CPUs physically cannot run above 70% for extended periods', 'Most monitoring tools stop reporting accurate metrics above 70% utilization'],
      explain: 'Near saturation, small load increases cause large latency increases, and there is no spare capacity to absorb a traffic burst or the failure of a peer. Headroom is what buys stable latency.'
    },
    {
      q: 'What happens to a queue when the arrival rate persistently exceeds service capacity (ρ ≥ 1)?',
      answer: 'It grows without bound until timeouts or memory limits hit',
      distractors: ['The queue stabilizes at a long but constant length', 'Service time automatically shrinks to match demand', 'Latency stays flat because requests are processed in parallel'],
      explain: 'If work arrives faster than it can be done, the backlog grows forever. Systems need bounded queues and load shedding so they fail fast rather than slowly drowning.'
    },
    {
      q: 'An overload triggers timeouts; clients retry; the extra retries keep the system overloaded even after the original spike ends. What is this called?',
      answer: 'A retry storm leading to metastable failure',
      distractors: ['Coordinated omission in the load generator', 'Amdahl’s serial bottleneck across the fleet', 'Sticky-session imbalance at the load balancer'],
      explain: 'Retries amplify load exactly when capacity is scarce, creating a self-sustaining failure state. Defenses include retry budgets, exponential backoff with jitter, circuit breakers and load shedding.'
    },
    {
      q: 'By Amdahl’s Law, if 90% of a workload is parallelizable, what is the maximum possible speedup with unlimited nodes?',
      answer: '10×',
      distractors: ['90×', 'Unlimited', '9×'],
      explain: 'Speedup<sub>max</sub> = 1 / (1 − p) = 1 / 0.1 = 10×. The 10% serial portion bounds the whole system no matter how many nodes you add.'
    },
    {
      q: 'In the Universal Scalability Law, what does the <strong>β (coherency)</strong> term model?',
      answer: 'Coordination cost between nodes, which can make throughput fall',
      distractors: ['The fraction of work that must run serially on one node', 'The time required to provision and boot a new node in the cloud provider', 'The probability that an individual node fails'],
      explain: 'α models contention (serial queuing, like Amdahl). β models crosstalk — cache coherence, distributed locks, replication acknowledgments — which grows with N². It produces a peak, after which adding nodes reduces throughput.'
    },
    {
      q: 'Given Amdahl’s Law and the USL, which design principle most improves horizontal scalability?',
      answer: 'Partition work and data so nodes share very little',
      distractors: ['Route all writes through a single global lock for safety', 'Have every node confirm each write with every other node', 'Use the largest available machine for every node'],
      explain: 'Shared locks and synchronous cross-node chatter are exactly the α and β terms. Partitioning — each node owning an independent slice — pushes both toward zero.'
    },
    {
      q: 'Which is a genuine <strong>advantage of vertical scaling</strong>?',
      answer: 'It usually needs no application changes',
      distractors: ['It removes every single point of failure', 'Its capacity ceiling is effectively unlimited', 'It allows live autoscaling without restarts'],
      explain: 'Moving to a bigger box keeps the same architecture and code. But it keeps the SPOF, has a hard ceiling (the largest machine), and usually needs a restart to resize.'
    },
    {
      q: 'Which scaling strategy does the module recommend as the mature default?',
      answer: 'Scale stateless tiers out early; scale stateful tiers up as long as practical',
      distractors: ['Shard the database on day one so it never needs to change', 'Scale everything vertically on ever-larger machines and avoid load balancers entirely', 'Scale stateful tiers horizontally first since they are the bottleneck'],
      explain: 'Stateless horizontal scaling is cheap to design for and buys redundancy. Sharding state is the most expensive complexity you can take on, so it is deferred until a well-tuned single primary (plus replicas) is genuinely insufficient.'
    },
    {
      q: 'After scaling to three replicas, a per-user visit counter keeps resetting to 1. What is the root cause?',
      answer: 'Each replica keeps the counter in its own memory',
      distractors: ['Nginx strips the URL path before forwarding requests', 'Redis evicts the key after every request', 'Docker restarts each container after every request'],
      explain: 'An in-memory <code>Map</code> is private to one process. Requests land on different replicas, each with its own count. Moving the counter to a shared store (Redis) makes the app stateless.'
    },
    {
      q: 'What is the main drawback of <strong>sticky sessions</strong>?',
      answer: 'Sessions are lost when that server dies, and load gets uneven',
      distractors: ['They require every request to be encrypted twice', 'They prevent the load balancer from terminating HTTPS connections for clients', 'They force the database to store all session data'],
      explain: 'Affinity pins users to one server, so that server’s memory becomes a SPOF for those users, and heavy users can overload one box. It is a stopgap, not a design.'
    },
    {
      q: 'What is the main trade-off of storing session state in signed client-side tokens such as JWTs?',
      answer: 'They are hard to revoke before they expire',
      distractors: ['Every request requires a database lookup to validate them', 'They only work when sticky sessions are enabled', 'They cannot carry any user identity information'],
      explain: 'Signature verification needs no server-side lookup — that’s the benefit. The cost: the server cannot easily “un-issue” a token, so teams use short expiries, refresh tokens, and sometimes a revocation list.'
    },
    {
      q: 'Why use Redis <code>INCR</code> rather than <code>GET</code> followed by <code>SET</code> for a shared counter?',
      answer: 'INCR is atomic, so concurrent updates are never lost',
      distractors: ['INCR stores the value on disk while SET keeps it only in memory', 'GET and SET are not available in recent versions of Redis', 'INCR automatically replicates the value to every app server'],
      explain: 'With GET+SET, two replicas can read 5, both write 6, and one increment disappears (a lost update). Redis executes commands sequentially, so INCR’s read-modify-write happens as one indivisible step.'
    },
    {
      q: 'A “send daily digest email” job runs on a timer inside the web process. You scale to 10 replicas. What happens?',
      answer: 'Every replica runs it, so users get the digest 10 times',
      distractors: ['The load balancer routes the job to exactly one healthy replica', 'Only the oldest replica runs the job automatically', 'The job stops running because no request triggers it'],
      explain: 'Timers inside a process run in every copy of that process. Scheduled work belongs in a single scheduler, a job queue, or a leader-elected worker — not in the scaled web tier.'
    },
    {
      q: 'Using the USE method, which observation most strongly identifies a bottleneck?',
      answer: '70% utilized with a steadily growing queue of waiting work',
      distractors: ['A resource at 100% utilization with no work waiting', 'A resource at 20% utilization with zero errors', 'A resource whose utilization was briefly high during deploy'],
      explain: 'Saturation (queued work) is the tell. 100% busy with nothing waiting is merely efficient; a growing queue means demand exceeds what the resource can serve.'
    },
    {
      q: 'What does the <strong>RED</strong> method track for each service?',
      answer: 'Rate, Errors and Duration',
      distractors: ['Replicas, Endpoints and Dependencies', 'Read, Execute and Delete operations', 'Reliability, Elasticity and Durability'],
      explain: 'RED (Tom Wilkie) covers request-driven services: requests per second, failed requests per second, and latency distribution. USE (Brendan Gregg) covers resources.'
    },
    {
      q: 'A Node.js server on an 8-core machine is at 100% CPU on one core and the other cores sit idle. What is the fix?',
      answer: 'Run several Node processes — one event loop uses one core',
      distractors: ['Raise the event loop’s thread priority in the operating system', 'Increase the HTTP keep-alive timeout so connections last longer', 'Add more RAM so the event loop can run on several cores'],
      explain: 'JavaScript in one Node process executes on a single thread. To use all cores, run one process per core behind a balancer — horizontal scaling inside one machine.'
    },
    {
      q: 'A request path depends on three components in series, each 99.9% available. What is the overall availability?',
      answer: 'About 99.7%',
      distractors: ['99.9%', 'About 99.97%', 'About 99.99%'],
      explain: 'Series availabilities multiply: 0.999³ ≈ 0.997. Every additional hard dependency lowers availability — about 26 hours of downtime per year here.'
    },
    {
      q: 'Two independent replicas, each 99% available, where either one can serve traffic. What is the combined availability?',
      answer: '99.99%',
      distractors: ['99%', '98.01%', '99.5%'],
      explain: 'In parallel, the system fails only if both fail: 0.01 × 0.01 = 0.0001, so availability is 99.99%. (98.01% would be the answer if both were required — the series case.)'
    },
    {
      q: 'A 99.9% availability SLO over 30 days allows roughly how much downtime?',
      answer: 'About 43 minutes',
      distractors: ['About 4 minutes', 'About 7 hours', 'About 26 seconds'],
      explain: '30 days ≈ 43,200 minutes; 0.1% of that is 43.2 minutes. That is your monthly error budget at three nines.'
    },
    {
      q: 'What is an <strong>error budget</strong>?',
      answer: 'The unreliability (100% − SLO) a team may spend on risk',
      distractors: ['The money reserved to refund customers after an outage', 'The number of bugs allowed in a release before rollback', 'The maximum number of servers that can fail simultaneously'],
      explain: 'A 99.9% SLO leaves 0.1% for deploys, experiments and failures. When it runs out, teams prioritize reliability over features — turning the speed-vs-stability debate into arithmetic.'
    },
    {
      q: 'How do an SLO and an SLA typically relate?',
      answer: 'The SLA is an external contract, looser than the SLO',
      distractors: ['The SLA is an internal target and the SLO is a legal contract', 'They are always the same number by definition', 'The SLO is always looser than the SLA to reduce risk'],
      explain: 'SLOs are internal objectives; SLAs are customer contracts with penalties. Keeping the SLA looser gives you a buffer: you notice and fix SLO breaches before they become contractual ones.'
    },
    {
      q: 'Two replicas are deployed across separate zones, yet both fail at the same moment. What is the most common real-world cause?',
      answer: 'A bad deploy or config change hitting both at once',
      distractors: ['Cosmic rays striking both zones at the same instant', 'The load balancer using round-robin instead of random', 'Using HTTP/2 instead of HTTP/1.1 between services'],
      explain: 'Redundancy math assumes independent failures. Changes are correlated by nature — the same artifact goes everywhere — which is why staged rollouts, canaries and fast rollback are reliability tools.'
    },
    {
      q: 'According to the CAP theorem, what must a replicated data system choose between <strong>during a network partition</strong>?',
      answer: 'Consistency or availability',
      distractors: ['Latency or throughput of writes', 'Durability or performance', 'Scalability or security'],
      explain: 'When replicas can’t communicate, a system either refuses some requests to stay consistent (CP) or answers them with possibly-stale data (AP). The choice only arises during a partition.'
    },
    {
      q: 'PACELC extends CAP. When there is <strong>no</strong> partition (“Else”), what is traded off?',
      answer: 'Latency versus consistency',
      distractors: ['Availability versus durability', 'Cost versus security', 'Throughput versus availability'],
      explain: 'Even with a healthy network, waiting for replicas to confirm writes (strong consistency) costs latency; replying sooner risks stale reads. Replication is never free.'
    },
    {
      q: 'An app has 10 M daily active users who each view ~50 photos per day. What is the approximate average read rate?',
      answer: 'About 5,000 requests per second',
      distractors: ['About 500 requests per second', 'About 50,000 requests per second', 'About 500,000 requests per second'],
      explain: '10 M × 50 = 500 M/day; ÷ ~100,000 s/day ≈ 5,000 req/s (exactly 500 M ÷ 86,400 ≈ 5,800 — the rounding is deliberate for napkin math). Then apply a peak factor (e.g. 3× → 15,000 req/s) before sizing.'
    },
    {
      q: 'You need 32 instances to serve peak load, spread across 3 availability zones, and must survive losing a whole zone. How many instances do you provision?',
      answer: '48 (16 per zone)',
      distractors: ['32 (about 11 per zone)', '96 (32 per zone)', '36 (12 per zone)'],
      explain: 'If one zone fails, the remaining two must carry the full peak: each needs 32 ÷ 2 = 16 instances. Three zones × 16 = 48 — i.e. 32 × 3/2.'
    },
    {
      q: 'Peak photo views are 15,000 req/s. If the CDN serves 95% of them, what load reaches the origin?',
      answer: '750 requests per second',
      distractors: ['1,500 requests per second', '7,500 requests per second', '14,250 requests per second'],
      explain: 'Only the 5% of misses reach the origin: 15,000 × 0.05 = 750 req/s. Immutable content plus a CDN can shrink an origin fleet by an order of magnitude.'
    }
  ],

  m2: [
    {
      q: 'Why does a load balancer make horizontal scaling of a stateless web tier possible?',
      answer: 'It exposes the pool as one address and spreads requests over healthy replicas',
      distractors: ['It merges every replica’s memory so they share sessions automatically', 'It caches every response so replicas never need to handle repeat traffic', 'It converts all incoming requests into idempotent operations that can be replayed'],
      explain: 'Clients talk to one stable address; the balancer decides which healthy replica serves each request or connection. That’s what lets you add and remove replicas freely.'
    },
    {
      q: 'Which statement about reverse proxies and load balancers is accurate?',
      answer: 'A reverse proxy may front one backend; a load balancer spreads load over many',
      distractors: ['A load balancer can only operate at layer 7 of the network stack', 'A reverse proxy is unable to terminate TLS connections for its backends', 'An API gateway is a special kind of DNS server that routes all incoming traffic purely by hostname'],
      explain: 'Any server accepting requests on behalf of backends is a reverse proxy, even with one backend. A load balancer’s purpose is distribution across many. Real tools (Nginx, Envoy, HAProxy) do both, at L4 and L7, and terminate TLS routinely.'
    },
    {
      q: 'What information does a <strong>layer 4</strong> load balancer use to make its decisions?',
      answer: 'IP addresses, ports and protocol',
      distractors: ['The URL path and the Host header', 'Session cookies set by the application', 'The HTTP method and request headers'],
      explain: 'L4 works at the transport layer (TCP/UDP). It never parses HTTP — especially when TLS is passed through encrypted — so paths, headers and cookies are invisible to it.'
    },
    {
      q: 'You need <code>/api/*</code> and <code>/images/*</code> on the same domain to go to different server pools. What do you need?',
      answer: 'An L7 balancer that terminates TLS and reads the path',
      distractors: ['An L4 load balancer configured with direct server return', 'A weighted DNS record splitting the domain between two IP addresses', 'Equal-cost multi-path routing configured on the network routers'],
      explain: 'Path-based routing requires seeing the HTTP request, which means decrypting TLS and parsing HTTP — layer 7. DNS and L4 operate on names, addresses and ports only.'
    },
    {
      q: 'A gRPC (HTTP/2) service sits behind an L4 balancer. One backend is overloaded while the others idle. Why?',
      answer: 'Each long-lived connection is pinned to one backend, carrying all its requests',
      distractors: ['HTTP/2 can only be served by the first backend registered with the load balancer pool', 'L4 balancers always route gRPC requests to the backend with the most memory', 'The HTTP/2 protocol disables all health checks performed by load balancers'],
      explain: 'HTTP/2 multiplexes many requests over one TCP connection, and L4 balances connections. Use per-request (L7) balancing such as Envoy, or client-side balancing in the gRPC library.'
    },
    {
      q: 'What is the main benefit of <strong>Direct Server Return (DSR)</strong>?',
      answer: 'Backends reply straight to clients, so the LB only handles inbound packets',
      distractors: ['The balancer can inspect and rewrite every outgoing response body', 'Clients can connect to backend servers without needing any balancer at all', 'TLS certificates no longer need to be installed on any server in the path'],
      explain: 'Responses are usually much larger than requests. With DSR the balancer rewrites incoming packets only; outbound traffic bypasses it, massively reducing the bytes it handles. The trade-off is that it never sees responses.'
    },
    {
      q: 'What is the core weakness of plain <strong>round robin</strong>?',
      answer: 'It ignores how busy each server currently is',
      distractors: ['It cannot work with more than two backend servers', 'It requires every request to carry a session cookie', 'It sends all traffic to the first server until it fails'],
      explain: 'Round robin hands out equal shares regardless of state. If one server is slow or stuck on heavy requests, it keeps getting its full share and its queue grows.'
    },
    {
      q: 'Why does <strong>least connections</strong> handle a slow server better than round robin?',
      answer: 'A slow server keeps more requests in flight, so it’s picked less often',
      distractors: ['It permanently removes any server whose average latency exceeds the fleet mean', 'It measures CPU usage directly on each backend before routing every request', 'It routes requests by hashing the client IP address to a consistent server'],
      explain: 'By Little’s Law, in-flight = rate × latency. A slow server accumulates in-flight requests, which automatically steers new work elsewhere — a self-correcting feedback loop.'
    },
    {
      q: 'How does the <strong>power of two choices</strong> algorithm work?',
      answer: 'Pick two servers at random and use the less loaded one',
      distractors: ['Send each request to two servers and use whichever answers first', 'Alternate between the two fastest servers seen during the last minute', 'Double the weight of any server that has been healthy for two checks'],
      explain: 'Sampling just two servers and choosing the less loaded dramatically reduces maximum load compared to random, while avoiding the herding that strict least-connections causes with stale information.'
    },
    {
      q: 'Dozens of independent proxies all run strict least-connections using slightly stale load data. What goes wrong?',
      answer: 'They all pick the same “least loaded” server at once and stampede it',
      distractors: ['They each assign requests to servers in exactly reverse order', 'They deadlock while waiting for each other to release connections', 'They stop sending any traffic until their load data is perfectly fresh again'],
      explain: 'This is the herd effect: identical decisions from identical stale views. Randomized choices (power of two) break the symmetry while keeping most of the benefit.'
    },
    {
      q: 'Which situation is a natural fit for <strong>weighted</strong> round robin?',
      answer: 'Sending 5% of traffic to a canary release',
      distractors: ['Pinning each user to one server for their session', 'Routing image paths to a separate storage pool', 'Detecting backends that return errors under load'],
      explain: 'Weights express proportions: bigger instances get more, a canary gets a small slice. Affinity is hashing, path routing is L7, and failure detection is health checking.'
    },
    {
      q: 'With <code>server = hash(key) % N</code>, roughly what fraction of keys move to a different server when N goes from 4 to 5?',
      answer: 'About 80%',
      distractors: ['About 20%', 'About 25%', 'About 5%'],
      explain: 'A key stays put only if hash mod 4 equals hash mod 5, which is true for about 1 in 5 keys. In general N/(N+1) of keys move — catastrophic for a cache tier.'
    },
    {
      q: 'With consistent hashing, roughly what fraction of keys move when a 5th server joins a ring of 4?',
      answer: 'About 20%',
      distractors: ['About 80%', 'About 50%', 'None of them'],
      explain: 'The new server takes over only the arc(s) of the ring before it — about 1/(N+1) of keys. Everything else keeps its owner.'
    },
    {
      q: 'Why do consistent-hashing implementations use <strong>virtual nodes</strong>?',
      answer: 'To even out key distribution and spread a leaving server’s keys widely',
      distractors: ['To let a single physical server own every key during a failover or maintenance event', 'To encrypt keys before they are placed onto the hash ring structure', 'To allow servers to join the ring without computing any hashes at all'],
      explain: 'Few points on a ring produce uneven arcs. Hashing each server 100–200 times averages the arcs out, and when a server leaves its many small arcs scatter across all remaining servers.'
    },
    {
      q: 'Why can hashing on the client’s IP address give badly uneven load?',
      answer: 'Thousands of users behind one NAT share a single IP',
      distractors: ['IPv4 addresses cannot be hashed by load balancers', 'Client IPs change with every single HTTP request', 'Hashing IP addresses always returns the same server'],
      explain: 'Corporate networks, mobile carriers and VPNs put many users behind one public IP. All of them hash to the same backend, creating a hot spot.'
    },
    {
      q: 'What does “consistent hashing with bounded loads” add?',
      answer: 'A cap on each server’s share; overflow keys spill to the next server',
      distractors: ['A limit on how many servers may be added to the ring in total', 'A rule that keys can only move during scheduled maintenance windows', 'A guarantee that every key is stored on at least three different servers'],
      explain: 'Affinity can overload a server holding hot keys. Bounded loads keep locality for most keys but redirect excess once a server exceeds a threshold (e.g. 125% of average).'
    },
    {
      q: 'What distinguishes <strong>passive</strong> health checking from active health checking?',
      answer: 'It watches real traffic for errors and timeouts instead of sending probes',
      distractors: ['It only runs when an operator manually triggers a check from the console', 'It checks the health of the load balancer itself rather than its backends', 'It sends probe requests more slowly to reduce load on struggling backends'],
      explain: 'Passive checks (outlier detection) infer health from live responses; active checks send synthetic probes like GET /health on a schedule. Open-source Nginx offers passive checks via max_fails/fail_timeout.'
    },
    {
      q: 'An active health check runs every 5 s and marks a backend down after 3 consecutive failures. Roughly how long until a dead backend stops receiving traffic?',
      answer: 'About 15 seconds',
      distractors: ['About 5 seconds', 'About 3 seconds', 'About 1 second'],
      explain: 'Detection time ≈ interval × failure threshold = 5 s × 3. During that window some requests still reach the dead backend — one reason proxies also retry idempotent requests.'
    },
    {
      q: 'Why should a <strong>liveness</strong> check avoid checking dependencies like the database?',
      answer: 'A dependency blip would mark every instance dead at once',
      distractors: ['Liveness checks are not allowed to open network connections', 'Databases reject queries that come from health-check endpoints', 'Checking dependencies makes the liveness endpoint return HTML'],
      explain: 'Liveness answers “should this process be restarted?” If it depends on the database, a brief DB slowdown restarts or ejects the whole fleet simultaneously, turning degradation into an outage.'
    },
    {
      q: 'The database slows down for 10 seconds, and suddenly the load balancer reports “no healthy upstream”. What most likely happened?',
      answer: 'Deep health checks queried the DB, so every app instance failed them',
      distractors: ['The load balancer’s TLS certificate expired at exactly the moment the slowdown began', 'The database restarted all of the application server processes', 'Round robin sent all requests to a single app instance at once'],
      explain: 'Health checks that cascade to shared dependencies remove all instances together. Keep checks about the instance itself, and consider fail-open behavior when every backend looks unhealthy.'
    },
    {
      q: 'During a graceful shutdown, what should an instance do <em>first</em> after receiving SIGTERM?',
      answer: 'Fail its readiness check while still serving in-flight requests',
      distractors: ['Exit immediately so the orchestrator can start a replacement', 'Close every open connection, including requests still in flight', 'Restart itself so that it comes back up with a fresh memory state'],
      explain: 'Failing readiness tells the balancer to stop sending new work; the instance keeps serving until the balancer has noticed and in-flight requests have finished. Then it closes and exits.'
    },
    {
      q: 'By default, how long does Docker wait after SIGTERM before sending SIGKILL to a container?',
      answer: '10 seconds',
      distractors: ['30 seconds', '60 seconds', '1 second'],
      explain: 'Docker’s default stop timeout is 10 s. If draining needs longer, set stop_grace_period in Compose (Kubernetes uses terminationGracePeriodSeconds, default 30 s).'
    },
    {
      q: 'Your container runs <code>CMD npm start</code> and your SIGTERM handler never fires. What is the likely cause?',
      answer: 'A wrapper process is PID 1 and doesn’t forward SIGTERM to Node',
      distractors: ['Node.js does not support handling signals on Linux', 'SIGTERM is only sent when containers run as root', 'npm disables all process.on signal handlers when NODE_ENV is production'],
      explain: 'With a shell or npm wrapper as PID 1, signals may not reach your app. Use the exec form CMD ["node", "server.js"] or an init process such as tini.'
    },
    {
      q: 'What problem does <strong>slow start</strong> for new backends solve?',
      answer: 'Cold instances being flooded before their caches and JIT warm up',
      distractors: ['Old instances shutting down too slowly during a rolling deployment', 'Clients opening TCP connections too quickly during a traffic spike', 'Health checks probing new instances too frequently during startup'],
      explain: 'A brand-new instance has zero connections, so least-connections would send it a burst immediately, while its caches are empty. Slow start ramps its share up over tens of seconds.'
    },
    {
      q: 'How should an application treat the <code>X-Forwarded-For</code> header?',
      answer: 'Only trust the entries appended by your own proxies',
      distractors: ['Trust the left-most value, since it is the original client', 'Ignore it entirely and always use the socket’s remote address', 'Reject any request that contains more than one IP address'],
      explain: 'Clients can send any X-Forwarded-For they like. Trust only the hops you control — e.g. Express’s trust proxy setting or Nginx’s set_real_ip_from — otherwise rate limits and audit logs can be spoofed.'
    },
    {
      q: 'How does a <strong>buffering</strong> reverse proxy protect app servers from slow clients?',
      answer: 'It absorbs slow uploads and downloads so app workers are freed quickly',
      distractors: ['It drops any client whose connection is slower than 1 Mbit/s to protect the backend servers', 'It compresses requests so that slow clients upload less data', 'It asks slow clients to retry later with a 429 status code'],
      explain: 'The proxy reads the full request at the client’s pace, sends it to the app in one fast burst, takes the response quickly, and trickles it back itself. This also blunts Slowloris-style attacks.'
    },
    {
      q: 'An edge proxy, a gateway and a service each retry failed calls up to 3 times. In the worst case, how many attempts can hit the database for one user request?',
      answer: '27',
      distractors: ['9', '6', '3'],
      explain: 'Retries multiply across layers: 3 × 3 × 3 = 27 — exactly when the database is already struggling. Retry at one layer, cap retries with budgets, and back off with jitter.'
    },
    {
      q: 'How should timeouts be arranged across the layers of a request path?',
      answer: 'Shorter at deeper layers than at the edge',
      distractors: ['Identical at every layer for consistency', 'Longer at deeper layers to give them time', 'Disabled internally and enforced only at the edge'],
      explain: 'If the edge gives up at 30 s, a backend still working at 45 s wastes resources on an answer nobody will receive. Inner timeouts should be tighter than outer ones.'
    },
    {
      q: 'By default, will Nginx’s <code>proxy_next_upstream</code> retry a failed <code>POST</code> on another server?',
      answer: 'No — non-idempotent requests aren’t retried by default',
      distractors: ['Yes — every method is retried until one of the servers succeeds', 'Yes — but only if the POST body is smaller than 1 MB', 'Only when the original server returned an HTTP 404'],
      explain: 'Since Nginx 1.9.13, non-idempotent requests (POST, LOCK, PATCH) aren’t passed to the next server unless you add the non_idempotent flag — retrying could duplicate side effects.'
    },
    {
      q: 'What does a <strong>VRRP / keepalived</strong> setup provide for the load balancer tier?',
      answer: 'A floating IP that moves to a standby when the active LB fails',
      distractors: ['Automatic TLS certificate renewal across every balancer instance', 'Per-request routing based on the URL path of incoming traffic', 'Global traffic steering based on the geographic location of users'],
      explain: 'VRRP gives an active-passive pair one virtual IP. If the active node dies, the passive claims the IP within a second or two. Simple, but the standby’s capacity sits idle.'
    },
    {
      q: 'How do routers using <strong>ECMP</strong> help scale the load balancer tier?',
      answer: 'They hash flows across several active balancers sharing one IP',
      distractors: ['They encrypt traffic between the balancers and the backends', 'They cache HTTP responses at the router to offload the balancers behind them', 'They assign every new user to the least-loaded data center'],
      explain: 'Equal-Cost Multi-Path routing spreads flows over multiple next hops. Several L4 balancers announce the same IP and all serve traffic — active-active and horizontally scalable.'
    },
    {
      q: 'What is <strong>anycast</strong>?',
      answer: 'One IP announced from many sites; routing picks the nearest',
      distractors: ['A DNS record type that lists every server in a region', 'A load-balancing algorithm that picks a random backend', 'A protocol for broadcasting each request to all backends at once'],
      explain: 'With anycast, many locations announce the same prefix via BGP and internet routing delivers each user to a nearby one. Withdrawing a site’s announcement fails traffic over at network speed.'
    },
    {
      q: 'What is a key limitation of DNS-based global load balancing?',
      answer: 'Cached answers live for their TTL, so changes and failovers are slow to apply',
      distractors: ['DNS can only return a single IP address for each hostname, so it cannot spread users across regions', 'DNS queries are encrypted, so providers cannot see the requester’s location', 'DNS-based steering only works for websites served over plain HTTP'],
      explain: 'Resolvers and clients cache DNS answers (and some ignore low TTLs), so shifting traffic takes time. DNS also sees the resolver’s location, not the user’s, unless EDNS Client Subnet is used.'
    },
    {
      q: 'You scale the <code>app</code> service from 3 to 6 replicas, but Nginx keeps sending traffic only to the original 3. Why?',
      answer: 'Nginx resolved the name to IPs at startup and needs a reload',
      distractors: ['Docker refuses to register replicas created after Nginx starts', 'The new replicas failed least_conn’s minimum-connection threshold', 'Nginx only supports a maximum of three upstream servers by default'],
      explain: 'Open-source Nginx resolves upstream hostnames when the configuration loads. Reload Nginx, use a resolver with variables, or use a proxy built for dynamic service discovery.'
    },
    {
      q: 'You deploy stateless web servers in five regions, but they all query one database in a single region. What happens to users far from that region?',
      answer: 'Every query pays a cross-region round trip, adding significant latency',
      distractors: ['Their requests are automatically served from a local read-only copy of the database', 'The database automatically shards itself to the nearest region', 'Latency is unaffected because web servers cache all query results'],
      explain: 'Moving the web tier closer only helps if the data is close too. Each cross-region query adds tens of milliseconds; multi-region designs need regional replicas or partitioned data.'
    }
  ],

  m3: [
    {
      q: 'Why is caching such an effective scaling technique?',
      answer: 'Cache hits never reach the origin, so the work disappears',
      distractors: ['It makes every database query execute on faster CPU hardware', 'It guarantees that every user always sees the most recent data', 'It removes the need to store data durably in a database at all'],
      explain: 'Caching doesn’t speed up work — it eliminates it for every hit. That’s why a high hit ratio lets a small database serve huge traffic.'
    },
    {
      q: 'Popularity follows a Zipf distribution over 1 million keys. Roughly what share of requests can a cache holding the hottest 1% of keys serve?',
      answer: 'About two-thirds',
      distractors: ['About 1%', 'About 10%', 'Nearly 100%'],
      explain: 'With Zipf exponent 1, the top 1% of keys draws about 68% of requests (Figure 3.1). Skew is why small caches are so powerful.'
    },
    {
      q: 'Your hit ratio improves from 90% to 99%. What happens to load on the database?',
      answer: 'It falls by about 10×',
      distractors: ['It falls by about 9%', 'It falls by about 50%', 'It stays roughly the same'],
      explain: 'Misses drop from 10% of traffic to 1% — a 10× reduction. At high hit ratios, each additional nine is enormously valuable.'
    },
    {
      q: 'Hit ratio is 95%, a cache lookup takes 1 ms and a database query takes 40 ms. What is the average latency (a miss pays for the lookup plus the query)?',
      answer: '3.0 ms',
      distractors: ['2.95 ms', '20.5 ms', '40 ms'],
      explain: '0.95 × 1 + 0.05 × (1 + 40) = 0.95 + 2.05 = 3.0 ms. Forgetting that misses also pay for the cache lookup gives 2.95 ms.'
    },
    {
      q: 'What does <code>Cache-Control: no-cache</code> mean?',
      answer: 'Caches may store it but must revalidate before each use',
      distractors: ['Caches must never store the response anywhere at all', 'Only the user’s browser may store it, never a shared CDN or proxy', 'The response may be served stale if the origin is down'],
      explain: 'Despite the name, no-cache allows storage; it only forbids reuse without checking with the server (e.g. via ETag). no-store is the directive that forbids storing.'
    },
    {
      q: 'Which directive suits a banking page that must never be written to any cache?',
      answer: '<code>no-store</code>',
      distractors: ['<code>no-cache</code>', '<code>private, max-age=60</code>', '<code>must-revalidate</code>'],
      explain: 'no-store forbids caches (browser or shared) from keeping a copy. no-cache and must-revalidate still allow storage; private allows the browser to keep it.'
    },
    {
      q: 'What does <code>s-maxage</code> control?',
      answer: 'Freshness lifetime in shared caches like CDNs only',
      distractors: ['Freshness lifetime in the user’s own browser, never in shared caches', 'How long a stale copy may be served during errors', 'The maximum size of a response that may be cached'],
      explain: 's-maxage overrides max-age for shared caches, letting a CDN keep a response longer than browsers (whose copies you can’t purge).'
    },
    {
      q: 'An API response contains the logged-in user’s order history. Which caching directive is appropriate?',
      answer: '<code>private</code> (or <code>no-store</code> if sensitive)',
      distractors: ['<code>public, s-maxage=3600, stale-while-revalidate=60</code>', '<code>public, immutable</code>', '<code>public, max-age=31536000</code>'],
      explain: 'Personalized content must never be stored by shared caches, or one user’s data can be served to another. private restricts storage to the user’s own browser.'
    },
    {
      q: 'A browser has a stale copy with <code>ETag: "v42"</code>. What happens on the next request if the content hasn’t changed?',
      answer: 'It sends If-None-Match and gets a 304 with no body',
      distractors: ['It downloads the full response again with a 200 status', 'It keeps using the copy without contacting the server', 'It receives a 404 because the ETag is no longer valid'],
      explain: 'Conditional requests revalidate cheaply: the server compares the ETag and replies 304 Not Modified, so the body isn’t re-sent.'
    },
    {
      q: 'What does <code>stale-while-revalidate=60</code> allow?',
      answer: 'Serve the stale copy while refreshing it in the background',
      distractors: ['Serve the stale copy only when the origin returns an error', 'Revalidate the response every 60 seconds even while fresh', 'Delete the cached copy 60 seconds after it becomes stale'],
      explain: 'For up to 60 s after expiry, users get an instant (slightly stale) response while the cache fetches a fresh one, hiding origin latency.'
    },
    {
      q: 'Which directive lets a cache keep serving content when the origin is failing?',
      answer: '<code>stale-if-error</code>',
      distractors: ['<code>no-cache</code>', '<code>s-maxage</code>', '<code>immutable</code>'],
      explain: 'stale-if-error=N permits serving an expired copy for up to N seconds when the origin errors — a cheap availability boost.'
    },
    {
      q: 'How do build tools let static assets be cached for a year while still updating instantly on deploy?',
      answer: 'Content hashes in filenames; HTML revalidated each time',
      distractors: ['They purge every browser cache after each deployment', 'They set max-age=0 on assets so browsers always refetch', 'They append the current time to every asset request URL'],
      explain: 'app.3f9a2c.js never changes, so it can be immutable for a year. The HTML (no-cache) references new hashed filenames after each deploy, which nobody has cached yet.'
    },
    {
      q: 'Why can <code>Vary: Cookie</code> destroy a CDN’s hit ratio?',
      answer: 'Each distinct cookie value becomes its own cache entry',
      distractors: ['It forces the CDN to purge its whole cache whenever any cookie changes', 'It forces every response to be re-compressed on each request', 'It makes the CDN treat every response as private data'],
      explain: 'Vary tells caches to keep one variant per value of the named header. Cookies are nearly unique per user, so almost every request misses.'
    },
    {
      q: 'A logged-in account page is mistakenly served with <code>Cache-Control: public, max-age=300</code>. What is the risk?',
      answer: 'A CDN may serve one user’s account page to other users',
      distractors: ['The page will load slightly slower for the logged-in user', 'Browsers will refuse to render the page at all', 'The CDN will reject the response and return a 500 error'],
      explain: 'Shared caches will store and reuse the response for anyone requesting that URL. This has caused real data leaks. Use private/no-store and bypass the CDN for authenticated requests.'
    },
    {
      q: 'What problem does a CDN <strong>origin shield</strong> (tiered cache) solve?',
      answer: 'Hundreds of PoPs each missing to the origin separately',
      distractors: ['Users connecting to a PoP far away from their location', 'Browsers caching responses longer than their max-age', 'Attackers reading cached content from other customers'],
      explain: 'Edge PoPs miss to the shield instead of the origin; only the shield fetches from the origin. Origin traffic falls and hit ratios rise because the shield is shared.'
    },
    {
      q: '1,000 users request the same expired object at the same moment. What CDN feature prevents 1,000 origin fetches?',
      answer: 'Request collapsing',
      distractors: ['Anycast routing', 'Cache-key normalization', 'Surrogate-key purging'],
      explain: 'Request collapsing (coalescing) sends a single request to the origin and fans the response out to all waiting clients.'
    },
    {
      q: 'Marketing links add <code>?utm_source=…</code> to URLs and the CDN hit ratio collapses. What is the fix?',
      answer: 'Strip tracking parameters from the cache key',
      distractors: ['Lower the TTL so entries refresh more often', 'Add Vary: Referer to every response header', 'Mark the affected pages as no-store responses'],
      explain: 'Every unique query string creates a new cache entry. Excluding parameters that don’t change the response from the cache key restores sharing.'
    },
    {
      q: 'Product 42 appears in its page, three API responses and several images. How do you invalidate all of them at once on the CDN?',
      answer: 'Tag responses with a surrogate key and purge by tag',
      distractors: ['Wait for each response’s TTL to expire naturally', 'Purge the entire CDN cache for the whole domain', 'Rename the product so that all of its URLs change and miss the cache'],
      explain: 'Surrogate keys (cache tags) label responses; purging the tag product-42 invalidates every tagged object across all PoPs in seconds.'
    },
    {
      q: 'Why can a CDN speed up even <strong>uncacheable</strong> dynamic requests?',
      answer: 'TCP/TLS handshakes end at a nearby PoP that reuses warm origin connections',
      distractors: ['The CDN stores every dynamic response for a few seconds anyway', 'The CDN runs your database queries on its own edge servers', 'The CDN compresses responses so that they no longer need any TLS encryption at all'],
      explain: 'Handshake round trips happen over a short distance; the PoP-to-origin leg uses long-lived, optimized connections. Fewer long round trips means lower latency without caching.'
    },
    {
      q: 'In the <strong>cache-aside</strong> pattern, what happens on a cache miss?',
      answer: 'The app reads the database and writes the result into the cache',
      distractors: ['The cache itself fetches the data from the database transparently', 'The request fails until a background job populates the cache', 'The app writes the data to the database and then to the cache'],
      explain: 'In cache-aside, the application owns the logic: check cache, on miss load from the DB, then populate. (When the cache library does it, that’s read-through.)'
    },
    {
      q: 'Why do cache-aside systems usually <strong>delete</strong> the key on writes rather than writing the new value into the cache?',
      answer: 'Deletes are idempotent and avoid cache/DB write-order races',
      distractors: ['Redis cannot overwrite an existing key with a new value', 'Deleting keys frees memory faster than updating them does', 'Updating keys is not supported by most distributed cache servers today'],
      explain: 'Two concurrent writers can apply DB writes in one order and cache writes in the other, leaving the cache wrong. Deleting lets the next reader reload from the source of truth.'
    },
    {
      q: 'What is the main risk of the <strong>write-behind</strong> pattern?',
      answer: 'Writes can be lost if the cache fails before flushing',
      distractors: ['Reads become slower because they always skip the cache', 'Every write must wait for both the cache and the DB', 'The cache is unable to hold any data that hasn’t been read at least once'],
      explain: 'Write-behind acknowledges writes once they’re in the cache and persists later. It absorbs bursts but trades away durability.'
    },
    {
      q: 'What is a typical downside of <strong>write-through</strong> caching?',
      answer: 'Slower writes, and it caches data that may never be read',
      distractors: ['The cache is often empty right after every write', 'Writes can be lost if the cache node crashes', 'It requires deleting the cache key after each write'],
      explain: 'Every write updates both cache and DB synchronously, so latency includes both, and rarely read items occupy cache memory.'
    },
    {
      q: 'Your Redis cache fills up and writes start failing with OOM errors. What is the most likely configuration issue?',
      answer: 'The eviction policy is still the default, noeviction',
      distractors: ['The keys were all created without a value', 'Redis was configured to use the LRU policy', 'The cache was sharded across too many nodes in the cluster'],
      explain: 'Redis’s default maxmemory-policy is noeviction: when full, writes fail. A pure cache should set maxmemory and allkeys-lru or allkeys-lfu.'
    },
    {
      q: 'When does <strong>LFU</strong> eviction outperform LRU?',
      answer: 'When one-off scans would otherwise flush popular items',
      distractors: ['When every key is accessed exactly once', 'When the cache is larger than the dataset', 'When every key must expire at one fixed time of day'],
      explain: 'A single large scan touches many cold items, making them “recently used” and pushing out hot ones under LRU. LFU remembers that hot items are frequently used.'
    },
    {
      q: 'Why keep a TTL on cache entries even if you invalidate explicitly on every write?',
      answer: 'It caps how long any missed invalidation can stay wrong',
      distractors: ['Redis refuses to store keys that have no TTL', 'TTLs make individual cache reads faster', 'Explicit invalidation commands only work on keys that have a TTL'],
      explain: 'Bugs, races and out-of-band writes will eventually skip an invalidation. A TTL guarantees the error heals itself within a bounded time.'
    },
    {
      q: 'How should you estimate how much memory a cache needs?',
      answer: 'Size it to the working set, then tune with hit and eviction metrics',
      distractors: ['Make it equal to the full size of the database', 'Use exactly half of the application server’s RAM, whatever the data size', 'Make it as small as possible to reduce staleness'],
      explain: 'The working set is the data actively used within a TTL window. Measure hit ratio and evictions as you resize; past a point, extra memory buys little (the Zipf curve flattens).'
    },
    {
      q: 'In the stale-set race, a slow reader writes an old value back after the writer’s delete. Which defense rejects that stale write outright?',
      answer: 'Leases or versioned compare-and-set writes',
      distractors: ['Increasing the cache memory limit', 'Switching eviction from LRU to LFU', 'Adding more application replicas behind the balancer'],
      explain: 'With leases, the delete invalidates the reader’s lease, so its later SET is refused. Versioned values with compare-and-set achieve the same. TTLs only bound the damage.'
    },
    {
      q: 'What is the main advantage of change-data-capture (CDC) based cache invalidation?',
      answer: 'It invalidates on every committed change, whoever made it',
      distractors: ['It removes the need for a database replication log', 'It makes cache reads strongly consistent with no delay', 'It lets the application skip writing to the database entirely'],
      explain: 'Tailing the DB’s replication log means scripts, migrations and other services’ writes all trigger invalidation, in commit order — nothing relies on every code path remembering.'
    },
    {
      q: 'A user edits their profile, reloads, and sees the old version from cache. Which consistency property is missing?',
      answer: 'Read-your-writes',
      distractors: ['Write-behind', 'Hash affinity', 'Eventual delivery'],
      explain: 'Read-your-writes guarantees a user sees their own changes. A common fix is to read the writer’s data from the source of truth (or bypass the cache) for a short window after they write.'
    },
    {
      q: 'A hot key expires and 2,000 concurrent requests all run the same expensive query. What is this, and what fixes it?',
      answer: 'A stampede; coalesce misses so one request recomputes',
      distractors: ['Penetration; add a Bloom filter of all valid keys in the table', 'An avalanche; add random jitter to every TTL', 'A hot partition; add more shards to the cache cluster'],
      explain: 'A cache stampede (thundering herd) is solved by request coalescing, locks/leases, serving stale while revalidating, or probabilistic early refresh.'
    },
    {
      q: 'A single viral post’s key saturates the one cache node that holds it. What helps?',
      answer: 'A short-lived in-process cache, or replicating the key',
      distractors: ['Shortening the TTL so it expires more often', 'Switching the node’s eviction policy to LFU', 'Caching negative results for every key that is missing'],
      explain: 'A hot key is limited by one node’s capacity. A local cache in each app instance (seconds of TTL) or copies under several keys spreads the read load.'
    },
    {
      q: 'Attackers request random non-existent product IDs, and every request reaches the database. What is this, and what helps?',
      answer: 'Cache penetration; cache “not found” results briefly',
      distractors: ['A cache stampede; add request coalescing', 'A cache avalanche; add random jitter to all of the TTLs', 'A hot key; add an in-process cache layer'],
      explain: 'Keys that don’t exist are never cached, so they always miss. Negative caching (short TTL), input validation or a Bloom filter of valid IDs stop them early.'
    },
    {
      q: 'After a deploy warms the cache, every key expires at the same moment an hour later and the database is overwhelmed. What prevents this?',
      answer: 'Adding random jitter to TTLs',
      distractors: ['Switching to write-through caching', 'Using a larger maxmemory setting', 'Removing TTLs from all keys'],
      explain: 'Synchronized expiry (an avalanche) creates a burst of misses. Jittered TTLs spread expiries out over time.'
    },
    {
      q: 'What is the right stance toward a cache that absorbs 95% of your read traffic?',
      answer: 'Decide and test what happens when it fails',
      distractors: ['Assume it’s always up since it’s in memory', 'Disable timeouts so calls always succeed', 'Shut down the database replicas to save cost'],
      explain: 'The database is sized for 5% of reads, so a cache outage can become a database outage. Use short timeouts, fail open with limits or degrade gracefully, and rehearse the failure.'
    },
    {
      q: 'In Redis Cluster, how do you guarantee that <code>user:42</code>’s profile and cart keys live on the same node?',
      answer: 'Use a hash tag, e.g. {user:42}:profile',
      distractors: ['Give both keys the same TTL value', 'Store both keys in the same database index', 'Prefix both keys with the node’s address'],
      explain: 'Redis Cluster maps keys to 16,384 slots via CRC16. With a hash tag, only the part inside braces is hashed, so both keys share a slot (and node), enabling multi-key operations.'
    },
    {
      q: 'Which statement correctly contrasts Memcached and Redis?',
      answer: 'Memcached: multi-threaded, no persistence; Redis: rich types, optional persistence',
      distractors: ['Memcached supports sorted sets and streams; Redis supports only plain string values', 'Redis has no replication support; Memcached replicates data across nodes', 'Both run commands on a single thread and offer identical data structures'],
      explain: 'Memcached is a simple, multi-threaded blob cache sharded by clients. Redis offers data structures, single-threaded atomic commands, replication, clustering and optional RDB/AOF persistence.'
    },
    {
      q: 'You run 50 app instances, each with its own in-process cache. What is the main drawback compared to a shared cache?',
      answer: '50 separate copies: more misses and inconsistent data',
      distractors: ['In-process caches are slower than network caches', 'In-process caches cannot store JSON-encoded values of any size', 'Each instance must ask Redis before using its copy'],
      explain: 'Each instance warms independently (50× the misses), holds duplicate data, and may disagree with the others. In-process caching suits tiny, ultra-hot, rarely changing data.'
    },
    {
      q: 'The lab’s <code>singleflight</code> coalesces misses per process. With 3 replicas, how many database queries can a stampede on one key cause?',
      answer: 'Up to 3',
      distractors: ['Exactly 1', 'Up to 2,000', 'Zero'],
      explain: 'Coalescing works within one process, so each replica may issue one query. Cross-instance protection needs a distributed lock or lease.'
    },
    {
      q: 'How does probabilistic early expiration (XFetch) prevent stampedes?',
      answer: 'Readers refresh slightly early with rising probability',
      distractors: ['It forbids reading a key in its final second', 'It stores two copies with staggered TTLs', 'It locks the key for every single reader at the moment of expiry'],
      explain: 'Each reader independently may recompute before expiry, with probability rising as expiry nears. Typically one request refreshes the value while everyone else keeps hitting.'
    }
  ],

  m4: [
    {
      q: 'Why is the database usually the hardest tier to scale?',
      answer: 'It holds state and promises durability, isolation and consistency',
      distractors: ['It is usually written in a slower programming language than the app', 'Databases cannot run on machines with more than one CPU core', 'Database software licenses forbid running more than one copy'],
      explain: 'Stateless tiers can be cloned freely. The database owns the data and its guarantees, and every way of spreading it across machines strains at least one of them.'
    },
    {
      q: 'A team reports “the database is slow” and proposes sharding. What should come first on the scaling ladder?',
      answer: 'Examine query plans and add or fix indexes',
      distractors: ['Migrate the whole dataset to a NoSQL database', 'Add asynchronous read replicas in every region', 'Shard immediately by hashing every primary key'],
      explain: 'Missing indexes and inefficient queries are the most common cause, and fixing them is cheap and often yields 10–1000× gains. Sharding is the last, most expensive step.'
    },
    {
      q: 'Roughly how many node visits does a B-tree index need to find one row among a billion?',
      answer: 'A handful (about 3–5)',
      distractors: ['About a billion', 'About 30,000', 'About one million, a thousandth of the rows'],
      explain: 'B-tree nodes hold hundreds of keys, so the tree is very shallow. A lookup reads one node per level — and the upper levels are almost always cached in RAM.'
    },
    {
      q: 'An <code>EXPLAIN ANALYZE</code> shows <code>Seq Scan</code> with “Rows Removed by Filter: 99999” for a query returning 1 row. What does it suggest?',
      answer: 'The filter column has no usable index',
      distractors: ['The table has too many indexes defined on it', 'The query result is being served from a cache', 'The database is running out of free disk space'],
      explain: 'The database read every row to find one match. An index on the filtered column would turn this into an index scan reading a few pages.'
    },
    {
      q: 'An index exists on <code>(tenant_id, created_at)</code>. Which query can use it efficiently?',
      answer: '<code>WHERE tenant_id = ? AND created_at &gt; ?</code>',
      distractors: ['<code>WHERE created_at &gt; ?</code> on its own', '<code>WHERE lower(tenant_id) = ?</code>', '<code>WHERE created_at = ? OR tenant_id = ? OR id = ?</code>'],
      explain: 'Composite indexes follow the leftmost-prefix rule: the leading column must be constrained. Equality on tenant_id then a range on created_at is the ideal shape.'
    },
    {
      q: 'What is a real cost of adding many indexes to a table?',
      answer: 'Every write must also update each index',
      distractors: ['Reads become slower for every query', 'The table can no longer be backed up', 'Rows are stored in random order on disk'],
      explain: 'Indexes speed reads but cost writes, RAM and disk. Unused indexes are pure overhead — audit them with pg_stat_user_indexes.'
    },
    {
      q: 'A page lists 100 orders and runs 101 database queries. What is this, and what fixes it?',
      answer: 'The N+1 problem; fetch related rows with a JOIN or a batch',
      distractors: ['A missing index; add one on the orders table primary key', 'Replication lag; send the queries to the primary instead', 'Lock contention; switch the isolation level to serializable'],
      explain: 'One query for the list plus one per item multiplies round trips. A JOIN or a batched WHERE id = ANY($1) does it in one or two queries.'
    },
    {
      q: 'Why does <code>LIMIT 20 OFFSET 100000</code> get slower as users page deeper?',
      answer: 'The database reads and discards all skipped rows',
      distractors: ['OFFSET disables every index on the table', 'Each page requires opening a brand-new database connection', 'The result is sorted again for every row'],
      explain: 'OFFSET still walks past 100,000 rows. Keyset pagination (WHERE id > last_seen ORDER BY id LIMIT 20) seeks directly to the start of the next page.'
    },
    {
      q: 'Why should production indexes on large, busy PostgreSQL tables be built with <code>CREATE INDEX CONCURRENTLY</code>?',
      answer: 'It avoids blocking writes during the build',
      distractors: ['It builds the index on every replica at once', 'It makes the finished index smaller on disk', 'It is the only way to build B-tree indexes'],
      explain: 'A plain CREATE INDEX locks the table against writes for the duration. CONCURRENTLY takes longer but lets traffic continue.'
    },
    {
      q: 'Why are database connections expensive in PostgreSQL?',
      answer: 'Each connection is a separate OS process with its own memory',
      distractors: ['Every connection keeps a full copy of the database in RAM', 'Each connection must re-download the schema on every query', 'Connections are billed individually by the PostgreSQL project'],
      explain: 'PostgreSQL forks a backend process per connection. Hundreds of them consume memory and contend for locks, and the default max_connections is only 100.'
    },
    {
      q: 'You autoscale from 4 to 60 app instances, each with a pool of 20 connections. What risk appears?',
      answer: '1,200 connections can exceed the database’s connection limit',
      distractors: ['Each instance’s pool automatically shrinks to fit the limit', 'Requests are evenly spread so total connections stay the same', 'The database automatically scales its connection limit up'],
      explain: 'Total connections = instances × pool size. The scale-out meant to add capacity can trigger “too many clients” errors. Bound totals with smaller pools or a pooler like PgBouncer.'
    },
    {
      q: 'What does PgBouncer’s <strong>transaction pooling</strong> mode do?',
      answer: 'Lends a server connection only for the duration of each transaction',
      distractors: ['Keeps one server connection per client until the client disconnects', 'Runs every transaction on a different replica for load spreading', 'Caches each transaction’s results so repeat queries skip the DB'],
      explain: 'Most client connections are idle at any instant, so lending real connections per transaction multiplexes thousands of clients onto a few dozen server connections.'
    },
    {
      q: 'Which feature can break under PgBouncer transaction pooling?',
      answer: 'Session state like SET variables or advisory locks',
      distractors: ['Simple SELECT queries with a WHERE clause', 'INSERT statements that use RETURNING id to fetch new keys', 'Transactions that update more than one row'],
      explain: 'Consecutive transactions may run on different server connections, so session-level state doesn’t persist. (Prepared statements need PgBouncer 1.21+ with max_prepared_statements.)'
    },
    {
      q: 'An app runs 2,000 queries/s, each holding a connection for 5 ms. About how many connections are busy on average?',
      answer: '10',
      distractors: ['400', '2,000', '100'],
      explain: 'Little’s Law: 2,000 × 0.005 = 10. Pools far larger than this mostly hold idle connections and add contention without adding throughput.'
    },
    {
      q: 'Why does fitting the <strong>working set</strong> in RAM matter so much for a database?',
      answer: 'Hot pages served from memory avoid slow storage reads',
      distractors: ['Data held in RAM no longer needs a write-ahead log for durability', 'Queries over data in RAM no longer need any indexes', 'RAM-resident tables are automatically replicated'],
      explain: 'When the working set fits in the buffer cache, most reads never touch disk. When it outgrows RAM, latency jumps suddenly as reads hit storage.'
    },
    {
      q: 'When ranking queries in <code>pg_stat_statements</code> to optimize, which sort is usually most useful?',
      answer: 'By total execution time',
      distractors: ['By query text alphabetically', 'By the most recent execution', 'By number of rows per table'],
      explain: 'A 2 ms query run 50,000 times a minute costs far more in aggregate than a rare 3-second report. Total time finds the biggest wins.'
    },
    {
      q: 'In leader-follower replication, where do writes go?',
      answer: 'Only to the primary, which streams changes to replicas',
      distractors: ['To whichever replica is closest to the user', 'To every replica in parallel first, then on to the primary', 'To a randomly chosen replica each time'],
      explain: 'The primary accepts all writes and ships its log (WAL/binlog) to replicas, which replay it and can serve reads.'
    },
    {
      q: 'What is the main trade-off of <strong>synchronous</strong> replication?',
      answer: 'No acknowledged write is lost, but every commit waits on a replica',
      distractors: ['Writes are faster, but replicas fall far behind the primary', 'Reads become strongly consistent on every async replica as well, at no extra cost', 'It removes the need for failover tooling and leader election'],
      explain: 'The primary confirms commits only after a replica has the data, which protects against loss on failover but adds a round trip to every write — and stalls writes if that replica is unavailable.'
    },
    {
      q: 'A user saves a profile change, refreshes, and sees the old value. What most likely happened?',
      answer: 'The read hit an async replica that had not caught up',
      distractors: ['The primary database rolled back the change', 'The browser sent the write request to the wrong domain name', 'The B-tree index on users became corrupted'],
      explain: 'This is a read-your-writes violation caused by replication lag. Route that user’s reads to the primary for a short window after they write.'
    },
    {
      q: 'Comments appear and then vanish on successive refreshes. What anomaly is this, and what helps?',
      answer: 'Non-monotonic reads; pin each user to one replica',
      distractors: ['A lost update; use SELECT … FOR UPDATE on reads', 'Write skew; switch every transaction to serializable', 'Split brain; restart the primary database server'],
      explain: 'Different replicas have different lag, so random routing can show data going “backwards in time”. Consistent per-user routing gives monotonic reads.'
    },
    {
      q: 'Your workload is write-heavy and the primary is saturated. Will adding read replicas help?',
      answer: 'No — every replica must replay every write',
      distractors: ['Yes — writes are spread evenly across replicas', 'Yes — replicas take over half of the commits', 'Only if replication is made fully synchronous'],
      explain: 'Replicas scale reads, not writes. Write scaling requires reducing write volume, scaling up, or partitioning/sharding.'
    },
    {
      q: 'During failover with asynchronous replication, what can happen to recent writes?',
      answer: 'Writes not yet replicated can be lost when a replica is promoted',
      distractors: ['They are automatically copied from the failed primary’s disk', 'They are replayed from the load balancer’s request buffer', 'They are always preserved because commits wait for every replica to confirm'],
      explain: 'Async replicas may lag behind the primary; promoting one discards whatever hadn’t reached it. Synchronous standbys avoid this at the cost of commit latency.'
    },
    {
      q: 'What is <strong>split brain</strong> in a replicated database?',
      answer: 'Two nodes both acting as primary and accepting conflicting writes',
      distractors: ['A replica serving reads while it is still catching up', 'A query planner choosing two different plans for one query', 'A table split into two partitions whose date ranges overlap with each other'],
      explain: 'If an old primary is partitioned rather than dead, promoting a replica can leave two primaries. Consensus-based election and fencing prevent it.'
    },
    {
      q: 'What makes time-range partitioning of an events table so useful for retention?',
      answer: 'Old data is removed by dropping a whole partition',
      distractors: ['Every partition is automatically stored on a separate server', 'Partitioned tables never need any indexes', 'Writes are spread evenly over all partitions'],
      explain: 'Dropping a partition is instant and avoids the slow, bloat-inducing DELETE of millions of rows. Queries on recent data also prune to a few partitions.'
    },
    {
      q: 'Which property matters most in a good shard key?',
      answer: 'It spreads load evenly and keeps most queries on one shard',
      distractors: ['It is whichever column has the shortest data type in the table', 'It changes frequently so that data moves between shards', 'It is the same value for most rows to simplify routing'],
      explain: 'Good shard keys have high cardinality, distribute writes and reads evenly, and align with access patterns so queries don’t need to scatter across shards.'
    },
    {
      q: 'You range-shard an events table by <code>created_at</code>. What problem appears?',
      answer: 'All new writes land on the newest shard',
      distractors: ['Old shards fill up faster than new shards', 'Range queries must touch every single shard', 'Rows are randomly spread with no locality'],
      explain: 'Sequential keys (timestamps, auto-increment IDs) concentrate inserts in one range, creating a hot shard while others sit idle. Hashing or a compound key spreads writes.'
    },
    {
      q: 'A dashboard needs “top 10 products across all users” in a database sharded by user_id. What happens?',
      answer: 'The query scatters to every shard and the slowest sets the latency',
      distractors: ['Only the shard holding the largest user answers the query', 'The query is rejected because sharded databases forbid aggregate queries', 'The router reads a cached global copy on every request'],
      explain: 'Cross-shard queries fan out and gather results; the tail-at-scale effect makes them slow. Precomputed aggregates or a separate analytics store usually serve them better.'
    },
    {
      q: 'Why are auto-increment integer IDs a problem in a sharded database?',
      answer: 'Separate shards would generate colliding IDs',
      distractors: ['Integers cannot be stored in sharded tables', 'They are slower to index than random strings', 'They reveal which shard holds which user'],
      explain: 'Each shard’s sequence counts independently. Use UUIDs (time-ordered UUIDv7 keeps index locality) or Snowflake-style IDs that embed a machine component.'
    },
    {
      q: 'Why do some sharded designs start with 1,024 logical shards on just 8 servers?',
      answer: 'Resharding becomes moving whole logical shards',
      distractors: ['More logical shards make each query faster', 'Each database server can only hold 128 tables at most', 'It avoids the need for any shard key at all'],
      explain: 'Pre-splitting means growth is handled by relocating logical shards to new servers, rather than re-hashing and migrating every row.'
    },
    {
      q: 'What does <strong>linearizability</strong> guarantee?',
      answer: 'Once a write completes, all later reads see it',
      distractors: ['Every replica eventually converges if writes stop', 'Each user sees their own writes but not others’', 'Writes are always applied in alphabetical order'],
      explain: 'Linearizable systems behave like a single up-to-date copy. It is the strongest model and requires coordination, which costs latency and availability during partitions.'
    },
    {
      q: 'A leaderless store has N = 3 replicas. Which read/write quorum setting guarantees that reads overlap the latest acknowledged write?',
      answer: 'W = 2, R = 2',
      distractors: ['W = 1, R = 1', 'W = 1, R = 2', 'W = 2, R = 1'],
      explain: 'Overlap requires R + W > N. With 2 + 2 = 4 > 3, every read set shares at least one replica with every write set.'
    },
    {
      q: 'What is PostgreSQL’s default transaction isolation level?',
      answer: 'Read Committed',
      distractors: ['Serializable', 'Read Uncommitted', 'Repeatable Read'],
      explain: 'PostgreSQL defaults to Read Committed; MySQL InnoDB defaults to Repeatable Read. Stronger levels prevent more anomalies but can abort transactions that must then be retried.'
    },
    {
      q: 'Two on-call doctors each check “someone else is on call” and both go off call. Which anomaly is this?',
      answer: 'Write skew',
      distractors: ['Dirty read', 'Replication lag', 'Phantom index'],
      explain: 'Each transaction reads a consistent snapshot and writes a different row, so neither sees the other’s change. Snapshot isolation allows it; serializable isolation prevents it.'
    },
    {
      q: 'Two buyers purchase the last item at the same time and stock goes negative. Which statement fixes it?',
      answer: '<code>UPDATE … SET stock = stock - 1 WHERE id = $1 AND stock &gt; 0</code>',
      distractors: ['<code>SELECT stock</code> in the app, then write back <code>stock - 1</code>', 'Adding a read replica to handle the extra traffic', 'Caching the stock value in Redis with a 60-second TTL'],
      explain: 'Read-modify-write in application code causes lost updates. An atomic conditional UPDATE (or SELECT … FOR UPDATE) makes the check and decrement indivisible.'
    },
    {
      q: 'What actually lets many NoSQL databases scale out easily?',
      answer: 'Data models that keep most operations on one partition',
      distractors: ['They don’t use any disk storage at all', 'They don’t support secondary indexes of any kind whatsoever', 'The SQL language itself is inherently slow'],
      explain: 'They push you to design around access patterns and partition keys, and drop features (joins, multi-row transactions) that are hard to distribute. SQL databases sharded the same way scale too.'
    },
    {
      q: 'Why is running heavy analytics queries on the production primary risky?',
      answer: 'They compete with live traffic for CPU, I/O and cache',
      distractors: ['Analytics queries are not allowed on primaries', 'They automatically lock every table for writes', 'Results read from a primary are always slightly out of date'],
      explain: 'Large scans evict hot pages from the buffer cache and consume I/O that checkout and login need. Route analytics to a replica or a columnar warehouse fed by CDC.'
    }
  ],

  m5: [
    {
      q: 'Which step of placing an order should usually stay <strong>synchronous</strong>?',
      answer: 'The payment decision the user must see',
      distractors: ['Sending the confirmation email', 'Generating and attaching the PDF invoice', 'Recording analytics events'],
      explain: 'Keep on the request path only what the user needs right now. Emails, invoices and analytics can run in the background, retried independently.'
    },
    {
      q: 'What does <strong>load leveling</strong> with a queue achieve?',
      answer: 'Spikes become a backlog drained at a steady rate',
      distractors: ['Every message is processed within one second', 'Producers are blocked until every consumer is idle', 'Message volume is reduced by merging duplicates'],
      explain: 'The queue absorbs bursts so downstream systems work at a sustainable rate instead of being overwhelmed by the peak.'
    },
    {
      q: 'What is a real cost of moving work to a queue?',
      answer: 'The system becomes eventually consistent and harder to debug',
      distractors: ['Every request becomes slower for the end user', 'The relational database must be replaced with a log-based store', 'Workers can no longer be scaled independently'],
      explain: 'Results arrive “soon”, failures can hide in stuck messages, and flows span processes. You need monitoring, DLQs and tracing to operate it well.'
    },
    {
      q: 'In a work queue with three competing consumers, how many consumers process each message?',
      answer: 'Exactly one',
      distractors: ['All three of them', 'Two, for redundancy', 'None until acknowledged'],
      explain: 'Competing consumers share the work: each message is delivered to one consumer and deleted when it is acknowledged.'
    },
    {
      q: 'Which messaging model sends each message to <em>every</em> interested service?',
      answer: 'Publish/subscribe',
      distractors: ['A work queue', 'A dead-letter queue', 'A connection pool'],
      explain: 'Pub/sub fans each message out to all subscribers, each typically with its own queue or subscription.'
    },
    {
      q: 'What most distinguishes a <strong>log</strong> (like Kafka) from a traditional queue?',
      answer: 'Messages are retained and consumers track their own offsets',
      distractors: ['Messages are deleted the instant any consumer reads them', 'Only one consumer may ever read the log during its lifetime', 'Logs guarantee global ordering across every partition'],
      explain: 'Logs keep messages for a retention period; each consumer group moves its own pointer. New consumers can replay history, and buggy ones can rewind.'
    },
    {
      q: 'A consumer processes a message, then crashes before acknowledging it. Under at-least-once delivery, what happens?',
      answer: 'The message is redelivered and may be processed twice',
      distractors: ['The message is lost and never processed again', 'The broker rolls back the consumer’s side effects automatically', 'The producer is asked to send a new copy'],
      explain: 'Without an ack, the broker assumes failure and redelivers. That’s why consumers must be idempotent.'
    },
    {
      q: 'Which approach is <strong>at-most-once</strong> processing?',
      answer: 'Acknowledge the message, then process it',
      distractors: ['Process the message, then acknowledge it', 'Process it twice and compare the two results', 'Store it in a dedupe table before processing'],
      explain: 'Acking first means a crash during processing loses the message. It suits data where small losses are acceptable, like metrics.'
    },
    {
      q: 'What do systems that advertise “exactly-once” actually provide?',
      answer: 'At-least-once delivery plus deduplication or idempotent effects',
      distractors: ['A network that never drops or duplicates any message at all', 'Guaranteed delivery by sending each message to two independent brokers', 'Effects on external systems that can always be rolled back'],
      explain: 'Exactly-once delivery across arbitrary systems is impossible with failures. “Effectively once” comes from redelivery combined with idempotent processing.'
    },
    {
      q: 'An SQS consumer takes 45 seconds per message with the default 30-second visibility timeout. What happens?',
      answer: 'The message reappears and is processed twice',
      distractors: ['SQS waits for the consumer to finish', 'The message moves straight to the DLQ', 'The queue rejects all new messages until it finishes'],
      explain: 'After the visibility timeout the message becomes visible again and another consumer takes it — duplicates without any crash. Extend the timeout while working.'
    },
    {
      q: 'How does the dedupe-table pattern make a consumer idempotent?',
      answer: 'It records the message ID in the same transaction as the effects',
      distractors: ['It deletes the message from the broker before processing it, so it cannot return', 'It keeps the message ID in process memory for an hour', 'It asks the producer to confirm the message before work'],
      explain: 'INSERT … ON CONFLICT DO NOTHING on the message ID commits atomically with the business changes. A redelivered message finds its ID and is skipped.'
    },
    {
      q: 'Which update is naturally idempotent?',
      answer: '<code>SET status = \'paid\'</code>',
      distractors: ['<code>SET points = points + 10</code>', '<code>INSERT</code> a new payment row', '<code>SET retries = retries + 1</code>'],
      explain: 'Setting an absolute value has the same result however many times it runs. Increments and plain inserts accumulate on every duplicate.'
    },
    {
      q: 'A consumer sends an email, then crashes before committing its database transaction. What prevents a duplicate email on retry?',
      answer: 'An idempotency key the email provider honors',
      distractors: ['Wrapping the email in the database transaction', 'Increasing the queue’s visibility timeout', 'Switching to at-most-once delivery semantics'],
      explain: 'External side effects can’t join your DB transaction. A stable idempotency key lets the provider recognize and ignore the repeat.'
    },
    {
      q: 'In Kafka, how is ordering guaranteed for all events of <code>cart:7</code>?',
      answer: 'Same key, same partition — and partitions are ordered',
      distractors: ['Kafka orders every message across all of its partitions', 'Consumers sort messages by timestamp before processing', 'Producers wait for each event to be consumed first'],
      explain: 'The key hashes to one partition, a partition is an ordered log, and one consumer in the group reads it. Ordering is per key, not global.'
    },
    {
      q: 'A topic has 6 partitions and a consumer group has 10 consumers. How many consumers do work?',
      answer: '6',
      distractors: ['10', '16', '1'],
      explain: 'Each partition is assigned to one consumer in a group, so parallelism is capped at the partition count. The other 4 sit idle as standbys.'
    },
    {
      q: 'Why should Kafka partition counts be planned ahead rather than increased casually later?',
      answer: 'Adding partitions changes the key-to-partition mapping',
      distractors: ['Partitions can never be added after a topic is created', 'More partitions always lower overall throughput', 'Each partition requires its own dedicated server'],
      explain: 'With hash partitioning, new partitions remap keys, breaking per-key ordering across the transition. Plan for future throughput up front.'
    },
    {
      q: 'Instead of strict end-to-end ordering, what simpler technique often suffices?',
      answer: 'Version each event and ignore ones older than current state',
      distractors: ['Use a single consumer for the entire topic forever', 'Retry every message until it finally arrives in the right order', 'Delay each message by a random amount of time'],
      explain: 'A consumer that applies an update only if its version is newer (UPDATE … WHERE version < $new) tolerates out-of-order delivery without serializing everything.'
    },
    {
      q: 'Arrivals are 500 msg/s during a 30 s spike and 100 msg/s otherwise; consumers drain 160 msg/s. How large does the backlog get?',
      answer: 'About 10,200 messages',
      distractors: ['About 4,800 messages', 'About 15,000 messages', 'It never grows at all'],
      explain: 'During the spike the backlog grows by 500 − 160 = 340 msg/s for 30 s = 10,200. Afterward it drains at only the spare 60 msg/s — taking about 170 s.'
    },
    {
      q: 'Steady-state arrivals exceed the consumers’ total capacity. What happens to the queue?',
      answer: 'The backlog grows without bound',
      distractors: ['It stabilizes at a fixed size', 'It drains once the spike ends', 'The broker speeds up the consumers'],
      explain: 'A queue only buffers temporary excess. If average arrivals exceed capacity, add consumers, make them faster, or shed load.'
    },
    {
      q: 'What is <strong>back-pressure</strong>?',
      answer: 'Signalling overload upstream so producers slow or stop',
      distractors: ['Compressing messages so the queue holds more', 'Retrying failed messages with exponential delays', 'Replaying old messages from the very start of the log'],
      explain: 'Bounded queues that reject when full, consumer prefetch limits and message TTLs push the overload signal back to the source instead of letting queues grow forever.'
    },
    {
      q: 'Why add <strong>jitter</strong> to exponential backoff?',
      answer: 'So failed clients don’t all retry at the same instant',
      distractors: ['So that every retry waits exactly the same amount of time', 'So that messages are processed in strict order', 'So the broker can compress the retry messages'],
      explain: 'Without randomness, everything that failed together retries together, recreating the overload. Full jitter spreads retries across the backoff window.'
    },
    {
      q: 'A malformed message fails on every attempt and blocks its partition. What is the standard remedy?',
      answer: 'Cap attempts and move it to a dead-letter queue',
      distractors: ['Retry it forever with ever-longer backoff delays', 'Delete the whole partition and recreate the topic', 'Increase the consumer’s visibility timeout to a day'],
      explain: 'Poison messages waste capacity and block ordered processing. After N attempts, park them in a DLQ, alert, and let humans fix and replay them.'
    },
    {
      q: 'Which queue health signal best reveals a stuck consumer?',
      answer: 'Age of the oldest message',
      distractors: ['Total messages published today', 'Average message size in bytes', 'Number of topics in the cluster'],
      explain: 'A long queue that drains quickly is fine; a short queue whose oldest message is 20 minutes old means nothing is moving. Track oldest-message age and consumer lag.'
    },
    {
      q: 'The code inserts an order, then publishes <code>order.created</code>. The process crashes between the two. What is the result?',
      answer: 'The order exists but no event is ever published',
      distractors: ['The database automatically rolls back the order', 'The broker publishes the event on the next restart', 'The event is published twice when the app restarts'],
      explain: 'This is the dual-write problem: no transaction spans the database and the broker, so one can succeed while the other doesn’t.'
    },
    {
      q: 'How does the <strong>transactional outbox</strong> pattern solve dual writes?',
      answer: 'The event row commits in the same transaction as the business data',
      distractors: ['The broker joins the database transaction via a two-phase commit protocol', 'The app publishes first and inserts the order only on success', 'Events are kept in process memory and flushed on shutdown'],
      explain: 'Writing the event to an outbox table in the same transaction makes both atomic. A relay (poller or CDC) then publishes it at least once.'
    },
    {
      q: 'Why does the outbox relay query use <code>FOR UPDATE SKIP LOCKED</code>?',
      answer: 'Several relays can run in parallel without taking the same rows',
      distractors: ['It guarantees each event is published exactly once overall, even after crashes', 'It prevents the application from writing new outbox rows', 'It deletes outbox rows as soon as they have been read'],
      explain: 'Each relay locks the rows it claims and skips rows locked by others. Publishing is still at-least-once (a crash after publish but before commit re-publishes).'
    },
    {
      q: 'What advantage does a CDC connector (e.g. Debezium) have over polling the outbox table?',
      answer: 'Lower latency and no polling load, by tailing the replication log',
      distractors: ['It removes the need for consumers to be idempotent at all', 'It allows events to be published before the database transaction commits', 'It stores events in the broker instead of the database table'],
      explain: 'CDC streams committed changes from the WAL/binlog as they happen. Delivery is still at-least-once, so consumers stay idempotent.'
    },
    {
      q: 'What is the difference between a command and an event?',
      answer: 'A command requests an action; an event states a fact',
      distractors: ['A command is always asynchronous; an event is synchronous', 'Commands go to many handlers; events go to one', 'Events can be rejected; commands cannot be'],
      explain: 'SendInvoice asks one handler to act and may be rejected. OrderPlaced announces something that already happened; any number of consumers may react.'
    },
    {
      q: 'In a saga, how is a failed step after “payment charged” handled?',
      answer: 'Earlier steps are undone by compensating actions like a refund',
      distractors: ['The distributed database rolls back every service automatically', 'The saga retries the failed step forever until it succeeds', 'The payment is left in place and the order is marked complete'],
      explain: 'Sagas chain local transactions. On failure, compensations semantically reverse completed steps — a visible business “undo”, not an invisible rollback.'
    },
    {
      q: 'What is a key drawback of <strong>choreographed</strong> sagas?',
      answer: 'The overall flow is hard to see and change',
      distractors: ['They require a central workflow engine', 'They only support two participating services', 'They force every step to be synchronous'],
      explain: 'Each service reacts to events with no central definition of the flow. Orchestration makes the flow explicit at the cost of a coordinator.'
    },
    {
      q: 'Why should background job payloads carry IDs rather than whole objects?',
      answer: 'Workers load fresh data, and queues stay small',
      distractors: ['Queues reject any payload larger than 100 bytes', 'IDs make jobs run in strict creation order', 'Objects can’t be serialized to JSON for queues'],
      explain: 'A job may run seconds or hours later; loading by ID avoids acting on stale snapshots and keeps the queue lean.'
    },
    {
      q: 'How should a daily report job be scheduled when the web tier runs 10 replicas?',
      answer: 'One scheduler enqueues it once for the workers',
      distractors: ['A timer inside every replica of the web app', 'Each replica runs it with a random start delay', 'The load balancer triggers it on the first request'],
      explain: 'Timers in every replica run the job 10 times. Use a single scheduler (repeatable jobs, Kubernetes CronJob, cloud scheduler) or leader election.'
    },
    {
      q: 'In the lab, BullMQ’s <code>jobId: `confirm-${orderId}`</code> option provides what?',
      answer: 'Idempotent enqueueing: duplicate adds are ignored',
      distractors: ['Strict FIFO ordering across every job in the queue', 'Automatic encryption of the job’s payload data', 'A guarantee that the job runs on a single worker'],
      explain: 'BullMQ ignores an add whose job ID still exists in the queue (including completed jobs it hasn’t cleaned up yet), so retried requests don’t enqueue duplicate confirmations. After a completed job is removed (removeOnComplete), the same ID could be added again — which is why the worker also checks confirmation_sent_at.'
    },
    {
      q: 'A job fails independently 10% of the time and is allowed 5 attempts. What is the chance it fails permanently?',
      answer: '0.001%',
      distractors: ['10%', '2%', '0.5%'],
      explain: 'All five attempts must fail: 0.1⁵ = 0.00001 = 0.001% — assuming failures are independent, which is why backoff (letting a dependency recover) matters.'
    }
  ],

  m6: [
    {
      q: 'What is the strongest reason to split a monolith into microservices?',
      answer: 'Letting teams deploy and scale parts independently',
      distractors: ['A stateless monolith cannot be scaled horizontally at all', 'Microservices always have lower latency than in-process calls', 'Microservices remove the need for any database transactions'],
      explain: 'A stateless monolith scales traffic fine behind a load balancer. Microservices mainly address organizational scale: independent deploys, ownership, and differing resource needs.'
    },
    {
      q: 'What is a <strong>modular monolith</strong>?',
      answer: 'One deployable with strictly enforced internal module boundaries',
      distractors: ['A set of microservices that all share a single database schema', 'A monolith that is split into one container per programming language', 'A monolith whose modules are each deployed to a separate region'],
      explain: 'It keeps the simplicity of one deployable and in-process calls while enforcing boundaries, which makes later extraction of services far easier.'
    },
    {
      q: 'What does <strong>Conway’s Law</strong> observe?',
      answer: 'System designs mirror the organization’s communication structure',
      distractors: ['Network latency doubles every time a new service is added to a call chain', 'The number of services should always equal the number of database tables', 'Every distributed system must eventually choose consistency over availability'],
      explain: 'Boundaries in software tend to follow team boundaries. The “inverse Conway maneuver” shapes teams around the architecture you want.'
    },
    {
      q: 'Where should service boundaries usually be drawn?',
      answer: 'Around business capabilities, like billing or catalog',
      distractors: ['Around technical layers, like “the database service” and “the UI service”', 'Around programming languages, so each service uses only one language', 'Around individual database tables, one service per table in the schema'],
      explain: 'Capability-aligned services change for one business reason and own their data. Layer-based splits force every feature change through several services.'
    },
    {
      q: 'Which is one of the classic <strong>fallacies of distributed computing</strong>?',
      answer: '“Latency is zero”',
      distractors: ['“Caches improve read latency”', '“Retries can duplicate requests”', '“Partitions can happen in a network”'],
      explain: 'The fallacies are false assumptions newcomers make: the network is reliable, latency is zero, bandwidth is infinite, the network is secure, and so on. The other options are true statements.'
    },
    {
      q: 'A request passes synchronously through 5 services, each 99.9% available. What is the best-case end-to-end availability?',
      answer: 'About 99.5%',
      distractors: ['99.9%', 'About 99.99%', 'About 95%'],
      explain: 'Series availabilities multiply: 0.999⁵ ≈ 0.995. Every synchronous hop lowers availability and adds latency.'
    },
    {
      q: 'Which situation describes a <strong>distributed monolith</strong>?',
      answer: 'Services that share a database and must deploy together',
      distractors: ['A monolith deployed as several identical replicas behind a load balancer', 'Services that communicate only through events on a message broker', 'A modular monolith whose modules have strict ownership boundaries'],
      explain: 'Tight coupling through shared schemas, synchronized releases and deep call chains gives the costs of distribution with none of the independence.'
    },
    {
      q: 'Why is <strong>gRPC</strong> popular for internal service-to-service calls?',
      answer: 'Typed contracts, compact binary messages and built-in deadlines',
      distractors: ['Browsers support it natively without any proxy or translation layer', 'Its responses are cached automatically by every CDN on the internet', 'It removes the need for load balancing between service instances'],
      explain: 'Protocol Buffers over HTTP/2 give efficient, schema-checked calls with streaming and deadline propagation. Browsers need gRPC-Web or a proxy, and it needs L7 or client-side balancing.'
    },
    {
      q: 'What is a major scaling risk of a public <strong>GraphQL</strong> API?',
      answer: 'One query can request enormous nested data',
      distractors: ['GraphQL cannot return more than one object type', 'GraphQL requires a new TCP connection per field', 'GraphQL responses can never be compressed'],
      explain: 'Without depth/complexity limits, batching and persisted queries, a single request can trigger millions of lookups.'
    },
    {
      q: 'Why should every list endpoint be paginated with a capped page size?',
      answer: 'Unbounded lists grow until one large customer causes an outage',
      distractors: ['HTTP forbids responses larger than one hundred kilobytes in size', 'Pagination automatically adds caching to every list response', 'Browsers refuse to parse JSON arrays with more than 100 items'],
      explain: 'An endpoint that returns “all orders” works in testing and fails for the customer with 2 million orders. Cursor pagination with a maximum page size bounds the work per request.'
    },
    {
      q: 'What problem do <strong>idempotency keys</strong> solve for <code>POST /payments</code>?',
      answer: 'Safe retries after an ambiguous failure, without double charges',
      distractors: ['Encrypting the payment details while they travel over the network', 'Ordering payments so they are processed strictly first-come first-served', 'Compressing the request body so that payments upload more quickly'],
      explain: 'The client sends the same unique key on every retry of one logical operation; the server returns the stored result instead of repeating the side effect.'
    },
    {
      q: 'Which API change is <strong>backward compatible</strong>?',
      answer: 'Adding a new optional field to a response',
      distractors: ['Renaming an existing field to a clearer name', 'Changing a field’s type from integer to string', 'Removing a field that few clients still use'],
      explain: 'Additive, optional changes are safe when clients are tolerant readers. Renames, removals and type changes break existing clients.'
    },
    {
      q: 'What is the safe sequence for replacing an API field?',
      answer: 'Expand, migrate clients, then contract',
      distractors: ['Contract first, then expand and migrate', 'Rename it in place in a single release', 'Migrate the clients before adding the field'],
      explain: 'Add the new field alongside the old one, move every client over, and only then remove the old field — compatible at every step.'
    },
    {
      q: 'Which responsibility belongs in an <strong>API gateway</strong>?',
      answer: 'Authentication, rate limiting and routing',
      distractors: ['Calculating discounts and validating order totals', 'Storing the shared database for all of the services', 'Rendering every page template for the frontend apps'],
      explain: 'Gateways handle cross-cutting edge concerns once. Business logic there makes the gateway a shared bottleneck every team must change.'
    },
    {
      q: 'What is a <strong>backend-for-frontend</strong> (BFF)?',
      answer: 'A thin service shaping data for one specific client',
      distractors: ['A database replica dedicated to serving the frontend team', 'A CDN configuration that caches only frontend static files', 'A load balancer that routes traffic by the browser’s user agent'],
      explain: 'Each BFF aggregates internal services into exactly what one client (web, mobile) needs, reducing round trips and absorbing UI churn.'
    },
    {
      q: 'In <strong>client-side</strong> service discovery, who picks the instance to call?',
      answer: 'The calling service, using registry data',
      distractors: ['A central load balancer in front of the service', 'The DNS root servers for the public internet', 'The database that stores the service’s own state'],
      explain: 'The caller queries a registry (or DNS) for healthy instances and load-balances itself. In server-side discovery, it calls a load balancer that does the lookup.'
    },
    {
      q: 'What does a <strong>service mesh</strong> add?',
      answer: 'Proxies that handle retries, mTLS and telemetry for every call',
      distractors: ['A shared database that every service reads and writes directly', 'A code generator that merges all of the services into one binary', 'A message broker that replaces all synchronous calls with events'],
      explain: 'Sidecar (or per-node) proxies configured by a control plane implement network policy uniformly, outside application code — at the cost of extra hops and operational complexity.'
    },
    {
      q: 'When is a service mesh most likely <em>not</em> worth it?',
      answer: 'A handful of services in one language',
      distractors: ['Hundreds of services in many languages', 'Strict mutual-TLS requirements everywhere', 'Many teams needing uniform traffic policy'],
      explain: 'For a small, homogeneous system, a shared client library provides timeouts, retries and metrics without a mesh’s operational overhead.'
    },
    {
      q: 'Why should services <strong>not</strong> share a database?',
      answer: 'It couples their schemas and blocks independent change',
      distractors: ['Relational databases cannot accept connections from two services', 'Shared databases are always slower than separate databases', 'Each service must use a different database vendor by policy'],
      explain: 'One team’s migration breaks another’s queries, and nobody can scale or change storage independently. Each service owns its data and exposes it via APIs or events.'
    },
    {
      q: 'The Orders service needs product names for its pages. Which approach keeps it fast and independent?',
      answer: 'Keep a local copy updated from ProductUpdated events',
      distractors: ['Query the Catalog service’s tables directly with SQL joins', 'Call the Catalog service synchronously for every single row', 'Ask the Catalog team to add an orders table to their database'],
      explain: 'An event-fed local read model gives fast local reads without coupling to another service’s schema; the copy is eventually consistent.'
    },
    {
      q: 'What does <strong>CQRS</strong> separate?',
      answer: 'The write model from one or more read models',
      distractors: ['Reads in one region from writes in another', 'Cached data from uncached data in memory', 'Public APIs from internal administrator APIs'],
      explain: 'Commands update a normalized model that enforces invariants; projections build denormalized read models shaped for queries, possibly in different stores.'
    },
    {
      q: 'What is a defining property of <strong>event sourcing</strong>?',
      answer: 'The event log is the source of truth; state is derived',
      distractors: ['Events are deleted once the current state has been saved', 'Every service writes its events into one shared table', 'State is stored only in caches and never in a database'],
      explain: 'Current state is rebuilt by replaying events, giving a full audit trail and rebuildable projections, with added complexity around schema evolution and snapshots.'
    },
    {
      q: 'How does the <strong>strangler fig</strong> pattern migrate a legacy system?',
      answer: 'A routing layer moves one capability at a time to new services',
      distractors: ['The whole system is rewritten and switched over in a single release', 'The old system is frozen and copied byte-for-byte into containers', 'All new features are paused until the rewrite is fully complete'],
      explain: 'Incremental, reversible steps — route a slice of traffic to the new service, verify, shift fully, delete old code, repeat — avoid risky big-bang cut-overs.'
    },
    {
      q: 'In the lab’s idempotency middleware, why is the key claimed with Redis <code>SET … NX</code>?',
      answer: 'So exactly one concurrent request wins the claim',
      distractors: ['So the key is encrypted before it is stored', 'So that Redis replicates the key to every node in the cluster', 'So the key never expires once it has been set'],
      explain: 'NX sets the key only if absent, atomically. A duplicate that arrives while the first is still running gets a 409; one that arrives afterward gets the stored response.'
    },
    {
      q: 'Why does the cursor-pagination lab fetch <code>limit + 1</code> rows?',
      answer: 'To know whether another page exists without COUNT(*)',
      distractors: ['To include a duplicate row for checksum validation', 'Because PostgreSQL LIMIT is off by one by design', 'To warm the cache for the following page in advance of the request'],
      explain: 'If the extra row comes back, there’s a next page. Counting all rows on a large table is itself an expensive scan.'
    },
    {
      q: 'Why should a long-running operation (like a 2-minute export) return <code>202 Accepted</code>?',
      answer: 'The client polls a status URL instead of holding a request open',
      distractors: ['HTTP forbids any response that takes longer than thirty seconds', '202 responses are automatically cached at the CDN for every user', 'It forces the browser to retry the request using HTTP/3 instead'],
      explain: 'Long-held requests tie up connections and workers and are fragile through proxies. Accept the work, process it asynchronously, and expose its status.'
    },
    {
      q: 'Why should API contracts be described in machine-readable schemas (OpenAPI, .proto, GraphQL SDL)?',
      answer: 'To generate clients and catch breaking changes in CI',
      distractors: ['Schemas make the network transfer of responses faster', 'Schemas are required for HTTPS certificates to validate', 'Schemas let services share a database safely by default'],
      explain: 'Independent teams deploy independently; a checked contract catches incompatible changes before they reach production.'
    },
    {
      q: 'An endpoint fans out to 4 services in parallel and waits for all of them. What sets its latency?',
      answer: 'The slowest of the four calls',
      distractors: ['The sum of all four latencies', 'The average of the four latencies', 'The fastest of the four calls'],
      explain: 'Parallel calls overlap, so the response waits for the slowest. And every call must still succeed, so availabilities multiply.'
    }
  ],

  m7: [
    {
      q: 'Why does frontend performance matter even when the backend responds in 50 ms?',
      answer: 'Most load time is often spent in the browser after the HTML arrives',
      distractors: ['Browsers always wait for the backend twice before rendering any page', 'A fast backend automatically makes JavaScript execute faster in browsers', 'Frontend code runs on your servers, so it competes with the backend'],
      explain: 'Downloading, parsing and executing resources on users’ devices frequently dominates total load time — and you can’t scale users’ phones.'
    },
    {
      q: 'What does <strong>LCP</strong> measure?',
      answer: 'When the largest visible image or text block renders',
      distractors: ['How long the server takes to send its first byte back', 'How many layout shifts happen during the page visit', 'How quickly the page responds to every user interaction'],
      explain: 'Largest Contentful Paint approximates “does the page look loaded?”. Good is ≤ 2.5 s at the 75th percentile.'
    },
    {
      q: 'Which metric replaced First Input Delay as a Core Web Vital in 2024?',
      answer: 'Interaction to Next Paint (INP)',
      distractors: ['Time to First Byte (TTFB)', 'Total Blocking Time (TBT) measured in the lab', 'First Contentful Paint (FCP)'],
      explain: 'INP became a Core Web Vital in March 2024. It measures responsiveness across all interactions in a visit, not just the first input.'
    },
    {
      q: 'What is a “good” CLS score?',
      answer: '0.1 or less',
      distractors: ['1.0 or less', '2.5 or less', '200 or less'],
      explain: 'Cumulative Layout Shift is unitless; ≤ 0.1 is good and > 0.25 is poor. (2.5 s is the LCP threshold; 200 ms is INP’s.)'
    },
    {
      q: 'At which percentile are Core Web Vitals assessed?',
      answer: 'The 75th percentile of page loads',
      distractors: ['The 50th percentile (median) of loads', 'The 99th percentile of the slowest loads', 'The average across all visits and devices'],
      explain: 'p75 balances typical and slow experiences: three quarters of visits must meet the threshold.'
    },
    {
      q: 'Why does a stylesheet in <code>&lt;head&gt;</code> delay the first paint?',
      answer: 'CSS is render-blocking until it loads',
      distractors: ['CSS files must be executed like scripts', 'Stylesheets disable the HTML parser forever', 'The browser downloads CSS only after images'],
      explain: 'Browsers avoid painting unstyled content, so they wait for render-blocking CSS. Inlining critical CSS lets the first paint happen sooner.'
    },
    {
      q: 'What does the <code>defer</code> attribute do for a script?',
      answer: 'Downloads in parallel and runs after parsing, in order',
      distractors: ['Runs it immediately when it arrives, in whatever order it lands', 'Prevents the script from being downloaded at all', 'Loads it only after the user first scrolls the page'],
      explain: 'Deferred scripts don’t block the parser and execute in document order once parsing finishes. async scripts run as soon as they arrive, in any order.'
    },
    {
      q: 'What does <code>&lt;link rel="preconnect"&gt;</code> achieve?',
      answer: 'Opens DNS, TCP and TLS to an origin ahead of time',
      distractors: ['Downloads every file from that origin immediately', 'Moves that origin’s files onto your own server', 'Caches the origin’s responses in a service worker'],
      explain: 'It saves the connection setup (several round trips) for resources you know you’ll request soon from that origin.'
    },
    {
      q: 'Why is JavaScript more expensive per byte than an image?',
      answer: 'It must be parsed, compiled and executed on the main thread',
      distractors: ['JavaScript files cannot be compressed at all for transfer', 'Browsers download JavaScript at half the speed of images', 'JavaScript is always fetched again on every page navigation'],
      explain: 'Images are decoded, often off the main thread. Script execution competes with rendering and input handling, hurting LCP and INP on slower devices.'
    },
    {
      q: 'What does <strong>code splitting</strong> with dynamic <code>import()</code> achieve?',
      answer: 'Ships only the code the current route needs',
      distractors: ['Splits each file across two CDNs for speed', 'Runs the code on two threads at the same time', 'Removes the need for any minification step'],
      explain: 'Rarely used features become separate chunks fetched on demand, shrinking the critical-path bundle.'
    },
    {
      q: 'Which rendering strategy scales best for a launch-day traffic spike on public pages?',
      answer: 'Static generation served from a CDN',
      distractors: ['Server-side rendering on every request', 'Client-side rendering with many API calls', 'Edge rendering with a central database'],
      explain: 'Pre-built static pages are just CDN files: no per-request compute, so a spike is only CDN traffic.'
    },
    {
      q: 'What is the scaling cost of <strong>server-side rendering</strong> (SSR)?',
      answer: 'Compute on every request, scaled like an API',
      distractors: ['Nothing — the CDN renders every page itself on demand', 'It requires one database per user session', 'It forces every image to be re-encoded'],
      explain: 'SSR gives fast first paint but renders per request, so servers must handle every page view (unless the output is cached).'
    },
    {
      q: 'Why can a server-rendered page look ready but ignore taps for a while?',
      answer: 'Hydration JavaScript is still downloading and running',
      distractors: ['The CDN blocks touch events during the first load', 'The HTML was sent without any event attributes', 'Browsers disable all input until every single image is decoded'],
      explain: 'Frameworks hydrate the component tree by executing JS before handlers attach. Large hydration work is a common INP problem.'
    },
    {
      q: 'What does ISR / revalidation offer?',
      answer: 'Static pages regenerated periodically or on change',
      distractors: ['Pages rendered fresh in the browser on each visit', 'A way to stream HTML to the browser in chunks from the origin', 'A database index for faster server-side queries'],
      explain: 'Incremental static regeneration keeps static-level speed and cost while bounding staleness.'
    },
    {
      q: 'Which image should <strong>never</strong> have <code>loading="lazy"</code>?',
      answer: 'The LCP hero image above the fold',
      distractors: ['Thumbnails in a long product list', 'Images in the footer of the page', 'Avatars in the comments section'],
      explain: 'Lazy loading delays the request until layout, which hurts LCP. Load the hero eagerly with fetchpriority="high"; lazy-load below-the-fold images.'
    },
    {
      q: 'Why always set <code>width</code> and <code>height</code> on images?',
      answer: 'So the browser reserves space and content doesn’t shift',
      distractors: ['So the image downloads from a closer CDN edge node', 'So the image is converted into AVIF format automatically', 'So the browser can skip decoding the image entirely'],
      explain: 'With known dimensions (or aspect-ratio), layout doesn’t jump when the image arrives, preventing CLS.'
    },
    {
      q: 'What do <code>srcset</code> and <code>sizes</code> enable?',
      answer: 'The browser picks an appropriately sized image file',
      distractors: ['The server picks a CDN region for each user', 'The image is split into tiles that load one after another in order', 'The browser blocks images larger than the viewport'],
      explain: 'Phones download small variants and large screens large ones, saving bytes without hurting quality.'
    },
    {
      q: 'What does <code>font-display: swap</code> do?',
      answer: 'Shows fallback text immediately, then swaps in the web font',
      distractors: ['Hides all text on the page until the web font has finished downloading', 'Downloads every weight of the font family in parallel', 'Replaces the web font with a system font permanently'],
      explain: 'Text stays visible during font loading. Tuning fallback metrics minimizes the layout shift at swap time.'
    },
    {
      q: 'What is a <strong>long task</strong> in browser performance?',
      answer: 'Main-thread work lasting over 50 ms',
      distractors: ['A network request lasting over 5 seconds', 'Any script file that is larger than 1 MB', 'A CSS animation running longer than 1 second'],
      explain: 'Long tasks block input handling and rendering. Breaking them up and yielding improves INP.'
    },
    {
      q: 'A page renders a 10,000-row table and typing in a filter box feels sluggish. What helps most?',
      answer: 'Virtualize the list to render only visible rows',
      distractors: ['Increase the server’s CPU allocation for the API', 'Add a longer Cache-Control header to the table', 'Preconnect to the origin that serves the table data'],
      explain: 'Rendering and re-rendering thousands of DOM rows is main-thread work. Virtualization renders the ~20 visible rows.'
    },
    {
      q: 'Where should heavy computation such as parsing a 20 MB JSON file run?',
      answer: 'In a Web Worker, off the main thread',
      distractors: ['In a CSS animation callback loop', 'In a requestAnimationFrame callback on the main thread', 'Inside a synchronous click handler'],
      explain: 'Workers run on separate threads, keeping the main thread free for input and rendering.'
    },
    {
      q: 'Which service-worker strategy fits fingerprinted static assets?',
      answer: 'Cache first',
      distractors: ['Network only', 'Network first', 'Never cache'],
      explain: 'Fingerprinted files never change, so serving from cache with network only on a miss is safe and fastest.'
    },
    {
      q: 'Why is a buggy service worker especially dangerous?',
      answer: 'It can intercept the requests you’d use to deploy a fix',
      distractors: ['It permanently deletes the browser’s HTTP cache files for the whole site', 'It forces every request through a slower HTTP version', 'It blocks the browser from running any other scripts'],
      explain: 'Users can be pinned to a broken version. Never long-cache the worker file, version caches, and keep a kill-switch worker ready.'
    },
    {
      q: 'What is the key difference between lab data and field (RUM) data?',
      answer: 'Field data comes from real users’ devices and networks',
      distractors: ['Lab data is always more accurate for judging real users', 'Field data can only be collected inside Lighthouse runs', 'Lab data includes every country, device and network type'],
      explain: 'Lab tools give reproducible debugging on one setup; RUM captures the real spread of experiences. Judge success with field p75.'
    },
    {
      q: 'Why does the RUM snippet send metrics with <code>navigator.sendBeacon</code>?',
      answer: 'It survives the page being unloaded',
      distractors: ['It encrypts metrics before sending them', 'It bypasses the need for any server endpoint', 'It batches metrics across different websites'],
      explain: 'Metrics like CLS and INP are often finalized when the user leaves; beacons are delivered even as the page unloads.'
    },
    {
      q: 'What is a <strong>performance budget</strong>?',
      answer: 'A limit (e.g. JS size or LCP) enforced in CI',
      distractors: ['The amount of money spent on CDN bandwidth', 'The maximum number of servers in production', 'The time engineers spend on performance work'],
      explain: 'Budgets turn performance into a guardrail: a pull request that exceeds them fails, catching regressions before users do.'
    },
    {
      q: 'What causes most layout shift from cookie banners and promo bars?',
      answer: 'Injecting them above content instead of reserving space',
      distractors: ['Serving them from a different CDN than the rest of the page', 'Writing them in CSS instead of using JavaScript', 'Loading them with HTTP/2 instead of HTTP/1.1'],
      explain: 'Content pushed down after render is a layout shift. Reserve the space up front or overlay the banner.'
    }
  ],

  m8: [
    {
      q: 'What makes container images valuable for horizontal scaling?',
      answer: 'One immutable artifact runs identically anywhere',
      distractors: ['Containers run faster than the host operating system', 'Images contain the full database for each service', 'Containers remove the need for any load balancer'],
      explain: 'Identical, immutable copies can be started on any machine, any number of times — exactly what autoscaling needs.'
    },
    {
      q: 'Which practice is a <strong>twelve-factor</strong> principle?',
      answer: 'Store configuration in the environment',
      distractors: ['Bake per-environment config into images', 'Write logs to local files inside containers', 'Keep user sessions in process memory'],
      explain: 'The same image should run in every environment, with config injected at runtime. Logs go to stdout; state goes to backing services.'
    },
    {
      q: 'Why copy <code>package*.json</code> and run <code>npm ci</code> <em>before</em> copying the source?',
      answer: 'Dependency layers stay cached when only code changes',
      distractors: ['npm cannot read package.json after source files exist', 'It makes the final image smaller by deleting the source', 'Docker requires dependencies to be installed as root'],
      explain: 'Each instruction is a cached layer. Ordering stable steps first means code edits don’t trigger a full reinstall.'
    },
    {
      q: 'What does a <strong>multi-stage</strong> Docker build achieve?',
      answer: 'Build tools stay out of the final runtime image',
      distractors: ['The image runs on several CPU architectures at once', 'The container restarts in stages after a crash', 'The build runs on multiple machines in parallel'],
      explain: 'Compilers and dev dependencies live only in the build stage; the runtime stage copies just the artifacts, shrinking size and attack surface.'
    },
    {
      q: 'Why is <code>ENV API_KEY=…</code> in a Dockerfile dangerous?',
      answer: 'The secret stays in the image layers for anyone who can pull it',
      distractors: ['Environment variables are limited to eight characters', 'Docker refuses to start containers that set an API key', 'The key is automatically rotated by Docker on every container restart'],
      explain: 'Layers are permanent and inspectable, even if a later layer removes the value. Inject secrets at runtime instead.'
    },
    {
      q: 'What does Kubernetes’ <strong>reconciliation loop</strong> do?',
      answer: 'Continuously moves actual state toward the declared desired state',
      distractors: ['Merges code changes from several Git branches automatically', 'Reconciles billing differences between cloud providers each month', 'Rebalances data between database shards on a fixed schedule'],
      explain: 'Controllers observe, compare with desired state, and act. A crashed pod is replaced simply because the count no longer matches.'
    },
    {
      q: 'Which object gives pods a stable DNS name and load-balances across the ready ones?',
      answer: 'Service',
      distractors: ['ConfigMap', 'ReplicaSet', 'Namespace'],
      explain: 'A Service selects pods by label and routes to those passing readiness. Pods come and go; the Service name stays.'
    },
    {
      q: 'What do CPU and memory <strong>requests</strong> control?',
      answer: 'What the scheduler reserves when placing the pod',
      distractors: ['The hard maximum the container may ever use', 'The billing rate charged by the cloud provider', 'The number of replicas created by the Deployment'],
      explain: 'Requests drive scheduling and are the baseline for utilization-based autoscaling. Limits are the runtime caps.'
    },
    {
      q: 'A container exceeds its <strong>memory limit</strong>. What happens?',
      answer: 'It is OOM-killed and restarted',
      distractors: ['It is throttled until memory frees up', 'It is moved to a node with more memory', 'Its memory limit is raised automatically'],
      explain: 'Memory can’t be throttled, so the kernel kills the process. CPU overuse, by contrast, is throttled.'
    },
    {
      q: 'Why do some teams omit CPU <strong>limits</strong> for latency-sensitive services?',
      answer: 'CFS throttling can add latency even at low average CPU',
      distractors: ['CPU limits are not supported by any managed Kubernetes', 'Without limits, pods are guaranteed a dedicated core', 'CPU limits prevent pods from being scheduled at all'],
      explain: 'Quota is enforced per short period; bursty multi-threaded work can exhaust it early and stall for the rest of the period. Accurate requests plus memory limits are a common compromise.'
    },
    {
      q: 'What does a failing <strong>readiness</strong> probe do?',
      answer: 'Removes the pod from Service endpoints without restarting it',
      distractors: ['Restarts the container immediately and resets all of its in-memory state', 'Deletes the Deployment and recreates it from scratch', 'Moves the pod to another node in a different zone'],
      explain: 'Readiness controls traffic; liveness controls restarts. A pod warming up or draining should fail readiness, not liveness.'
    },
    {
      q: 'What is the purpose of a <strong>startup probe</strong>?',
      answer: 'Giving slow-starting apps time before liveness checks begin',
      distractors: ['Starting extra replicas when traffic suddenly increases', 'Checking that a container image was signed before it runs', 'Running database migrations before the app container starts'],
      explain: 'Without it, a slow-booting app can be killed by liveness checks before it ever finishes starting.'
    },
    {
      q: 'Why add a short <code>preStop</code> sleep to pods?',
      answer: 'Traffic can still arrive after SIGTERM, until routing updates',
      distractors: ['Kubernetes requires every container to sleep before it can exit', 'It makes new pods start faster on the node', 'It prevents the image from being pulled again'],
      explain: 'Pod deletion triggers SIGTERM and endpoint removal concurrently. Sleeping briefly keeps the pod serving until routing stops sending it traffic.'
    },
    {
      q: 'What does a <strong>PodDisruptionBudget</strong> protect against?',
      answer: 'Voluntary evictions taking down too many replicas at once',
      distractors: ['Pods using more memory than their configured limit allows', 'Nodes crashing because of hardware failures in the rack', 'Images being pulled from an untrusted container registry'],
      explain: 'Node drains and autoscaler scale-downs respect PDBs, keeping a minimum number of replicas serving.'
    },
    {
      q: 'An HPA sees 4 replicas at 90% CPU with a 60% target. How many replicas does it want?',
      answer: '6',
      distractors: ['5', '8', '4'],
      explain: '⌈4 × 90/60⌉ = ⌈6⌉ = 6. The ratio is outside the default 10% tolerance, so it scales.'
    },
    {
      q: 'Why does the HPA wait (by default 5 minutes) before scaling down?',
      answer: 'To avoid flapping on brief dips in load',
      distractors: ['Because pods cannot terminate faster', 'To give images time to be garbage-collected', 'Because metrics are only collected hourly'],
      explain: 'The scale-down stabilization window uses the highest recommendation over the window, preventing rapid up/down oscillation.'
    },
    {
      q: 'Pods are Pending because no node has room. What adds capacity?',
      answer: 'A node autoscaler such as Cluster Autoscaler or Karpenter',
      distractors: ['The Horizontal Pod Autoscaler raising maxReplicas further', 'A PodDisruptionBudget with a higher minAvailable value', 'A readiness probe with a shorter period between checks'],
      explain: 'HPA changes pod counts; node autoscalers add machines when pods can’t be scheduled.'
    },
    {
      q: 'Which tool scales queue workers on Kafka lag or SQS depth, including to zero?',
      answer: 'KEDA',
      distractors: ['VPA', 'kubelet', 'CoreDNS'],
      explain: 'KEDA (Kubernetes Event-Driven Autoscaling) feeds external metrics to scaling decisions and can scale idle workers to zero.'
    },
    {
      q: 'Why can’t autoscaling alone absorb a sudden 10× spike?',
      answer: 'Metrics, scheduling, image pulls, startup and new nodes take minutes',
      distractors: ['Kubernetes only allows one scaling action per day', 'Autoscalers never scale beyond double the current size, by design, in any cluster', 'Pods cannot be added while traffic is being served'],
      explain: 'The delays stack up. Headroom, fast startup, placeholder capacity and scheduled scaling cover the gap.'
    },
    {
      q: 'Why must <code>maxReplicas</code> consider downstream systems?',
      answer: 'More pods mean more DB connections and retry load',
      distractors: ['More replicas slow the Kubernetes API server', 'Each new replica requires its own dedicated load balancer', 'Pods beyond the limit cannot read ConfigMaps'],
      explain: 'Scaling the stateless tier multiplies pressure on the database and other dependencies (Module 04’s connection storm).'
    },
    {
      q: 'Which deployment strategy limits a bad release to a small slice of users first?',
      answer: 'Canary',
      distractors: ['Recreate', 'Blue-green', 'Big bang'],
      explain: 'A canary shifts 1% → 5% → … while comparing metrics, rolling back automatically if they degrade.'
    },
    {
      q: 'What is the main trade-off of <strong>blue-green</strong> deployments?',
      answer: 'Instant switch and rollback, but double capacity and all users move at once',
      distractors: ['Slow rollback, because all the old pods are deleted before the new ones can start', 'Old and new versions can never run at the same time in any form', 'It works only for databases and not for stateless applications'],
      explain: 'Two full environments let you flip traffic instantly, at the cost of running both and exposing everyone at the switch.'
    },
    {
      q: 'What do feature flags decouple?',
      answer: 'Deploying code from releasing features',
      distractors: ['Reading data from writing data', 'Containers from the base images they were built on', 'Pods from their assigned nodes'],
      explain: 'Code ships dark and is enabled per user or segment at runtime, with an instant off switch.'
    },
    {
      q: 'During a rolling deploy, why must schema changes be backward compatible?',
      answer: 'Old and new app versions use the same database simultaneously',
      distractors: ['Kubernetes runs schema migrations twice for every single deployment', 'The database is cloned for each version during the rollout', 'Rolling deploys disable database writes until they complete'],
      explain: 'Both versions run side by side, so the schema must work for both (expand → migrate → contract).'
    },
    {
      q: 'What is a <strong>cold start</strong> in serverless platforms?',
      answer: 'Latency when a new instance must initialize before serving',
      distractors: ['The time to provision a brand-new cloud account for a team', 'A server that has not received traffic for over thirty days', 'A database failover that happens during the night hours'],
      explain: 'Scaling out or scaling from zero means initializing runtimes and code; the first request on each new instance pays for it.'
    },
    {
      q: 'Why can serverless functions overwhelm a relational database?',
      answer: 'Each concurrent instance opens its own connections',
      distractors: ['Functions bypass the database’s authentication', 'Functions always run queries without indexes', 'Serverless platforms disable all forms of connection pooling'],
      explain: 'A spike to 1,000 instances can mean 1,000+ connections. Use a connection proxy (e.g. RDS Proxy) or HTTP-based data APIs.'
    },
    {
      q: 'In the kind lab, why is metrics-server needed?',
      answer: 'The HPA reads pod CPU usage from it',
      distractors: ['kind cannot start pods without it', 'It stores the container images locally', 'It provides DNS names for each Service'],
      explain: 'Resource-metric autoscaling depends on the metrics API, which metrics-server provides.'
    }
  ],

  m9: [
    {
      q: 'How does <strong>observability</strong> differ from monitoring?',
      answer: 'It lets you answer questions you didn’t anticipate',
      distractors: ['It only collects metrics and never collects any logs or traces', 'It replaces alerting with weekly written reports', 'It requires running every service in debug mode'],
      explain: 'Monitoring checks known conditions; observability is rich, correlated telemetry that supports exploring new, unforeseen questions.'
    },
    {
      q: 'Which telemetry type best answers “where did the time go in this one request across services?”',
      answer: 'A distributed trace',
      distractors: ['A gauge metric', 'A CPU flame graph', 'A daily digest of error logs'],
      explain: 'Traces record each step (span) of one request across services with timing and causality.'
    },
    {
      q: 'Why use <strong>structured</strong> (JSON) logs?',
      answer: 'Fields can be indexed, filtered and aggregated reliably',
      distractors: ['JSON logs are always smaller than plain text logs', 'Structured logs never need to be shipped anywhere', 'JSON automatically removes passwords and other sensitive data from logs'],
      explain: 'Consistent fields (orderId, durationMs) turn logs into queryable data instead of text for fragile regexes.'
    },
    {
      q: 'What is the purpose of a <strong>correlation (request) ID</strong>?',
      answer: 'Linking every log line about one request across services',
      distractors: ['Encrypting log lines so only admins can read them', 'Counting how many requests each user made today', 'Ordering log lines alphabetically inside the central log store'],
      explain: 'Generated at the edge and propagated in headers and messages, one ID retrieves the whole story.'
    },
    {
      q: 'What should <strong>never</strong> appear in application logs?',
      answer: 'Passwords, tokens and card numbers',
      distractors: ['Request durations and status codes', 'Route names and error messages', 'Service names and instance IDs'],
      explain: 'Logs are widely copied and retained; secrets and personal data in them create security and privacy incidents. Redact at the logger.'
    },
    {
      q: 'Which metric type is right for “total HTTP requests served”?',
      answer: 'Counter',
      distractors: ['Gauge', 'Histogram bucket', 'Exemplar'],
      explain: 'Counters only increase; you query their rate. Gauges go up and down (queue depth); histograms capture distributions.'
    },
    {
      q: 'Why use a <strong>histogram</strong> rather than per-instance percentile metrics for latency?',
      answer: 'Histograms can be summed across instances before computing percentiles',
      distractors: ['Histograms are always smaller to store than any other metric type available', 'Percentile metrics cannot be graphed in any dashboard tool', 'Histograms record the exact latency of every individual request'],
      explain: 'Percentiles can’t be averaged; bucket counts can be summed fleet-wide, then histogram_quantile computes the true p99.'
    },
    {
      q: 'Adding <code>user_id</code> as a Prometheus label suddenly overloads the metrics system. Why?',
      answer: 'Each unique label value creates a separate time series',
      distractors: ['Prometheus cannot store numeric labels of any length', 'Labels are encrypted, and that is computationally heavy', 'User IDs force Prometheus to scrape every second'],
      explain: 'Unbounded labels cause cardinality explosions. Keep identifiers in logs and traces; use bounded labels in metrics.'
    },
    {
      q: 'Which PromQL computes fleet-wide p99 latency?',
      answer: '<code>histogram_quantile(0.99, sum by (le) (rate(…_bucket[5m])))</code>',
      distractors: ['<code>avg(rate(http_request_duration_seconds_p99[5m]))</code>', '<code>max(http_request_duration_seconds_count{job="scale-lab"}) * 0.99</code>', '<code>sum(rate(http_requests_total[5m])) / 0.99</code>'],
      explain: 'Rate the buckets, sum them across instances by le, then compute the quantile from the merged histogram.'
    },
    {
      q: 'Which are Google’s four <strong>golden signals</strong>?',
      answer: 'Latency, traffic, errors, saturation',
      distractors: ['Uptime, deploys, support tickets and cloud cost', 'CPU, memory, disk, network', 'Logs, metrics, traces, profiles'],
      explain: 'They cover what users feel (latency, errors) and how loaded the service is (traffic, saturation), aligning with RED and USE.'
    },
    {
      q: 'What is a <strong>span</strong>?',
      answer: 'One timed operation within a trace, with a parent',
      distractors: ['A time range selected on a Grafana dashboard', 'A group of log lines sharing the same severity', 'A Prometheus label set that spans many services in the cluster'],
      explain: 'Spans (HTTP handler, DB query, outbound call) nest into a tree that forms the trace.'
    },
    {
      q: 'What does the W3C <code>traceparent</code> header carry?',
      answer: 'The trace ID and parent span ID for context propagation',
      distractors: ['The user’s session cookie, for authentication purposes downstream', 'The full list of log lines from the calling service', 'The p99 latency of the upstream service’s endpoint'],
      explain: 'Propagating it on every outgoing call (and in messages) lets spans from different services join one trace.'
    },
    {
      q: 'What is <strong>OpenTelemetry</strong>?',
      answer: 'A vendor-neutral standard and SDKs for traces, metrics and logs',
      distractors: ['A commercial dashboard product sold exclusively by a single cloud provider', 'A database designed specifically for storing log lines cheaply', 'A load-testing tool that generates synthetic user traffic'],
      explain: 'OTel instruments code (often automatically) and exports via OTLP to any compatible backend.'
    },
    {
      q: 'Why might you prefer <strong>tail sampling</strong> over head sampling?',
      answer: 'It can keep all error and slow traces',
      distractors: ['It needs no buffering of spans at all', 'It samples before the request even starts', 'It is cheaper than collecting no traces'],
      explain: 'Head sampling decides blindly at the start and discards most rare failures; tail sampling decides after seeing the whole trace.'
    },
    {
      q: 'Why alert on SLO symptoms rather than causes like “CPU above 80%”?',
      answer: 'Cause alerts page often without user impact, causing fatigue',
      distractors: ['CPU metrics cannot be collected inside containers', 'SLO alerts never fire during real incidents', 'Cause-based alerts are explicitly forbidden by every SRE policy and standard'],
      explain: 'Paging on what users feel keeps alerts meaningful; causes belong on dashboards and in tickets.'
    },
    {
      q: 'With a 99.9% SLO, what does a <strong>burn rate of 1</strong> mean?',
      answer: 'The budget would last exactly the SLO window',
      distractors: ['The service is completely down right now', 'Exactly one error has occurred in the SLO window so far', 'The budget is gone within a single hour'],
      explain: 'Burn rate is error rate divided by the budget rate. At 1, you spend the budget evenly over the whole window.'
    },
    {
      q: 'With a 99.9% SLO over 30 days, a 1.44% error rate is a burn rate of 14.4. Roughly how fast is the budget gone?',
      answer: 'About 2 days',
      distractors: ['About 14 days', 'About 1 hour', 'About 30 days'],
      explain: '30 days ÷ 14.4 ≈ 2.1 days. That rate consumes 2% of the monthly budget in one hour, which is why it pages.'
    },
    {
      q: 'Why do multi-window burn-rate alerts include a <strong>short</strong> window?',
      answer: 'So the alert resets quickly after recovery',
      distractors: ['So that the alert fires before any errors occur', 'So that alerts fire only on weekdays', 'So that dashboards refresh more frequently'],
      explain: 'The long window makes the alert significant; the short window confirms it’s still happening, so it clears soon after a fix.'
    },
    {
      q: 'What should every paging alert link to?',
      answer: 'A runbook with meaning, checks and first mitigations',
      distractors: ['The full source code of the affected service', 'A list of every engineer’s personal phone number', 'The raw Prometheus configuration file for the cluster'],
      explain: 'Runbooks cut time to mitigation, especially for on-call engineers unfamiliar with the service.'
    },
    {
      q: 'During an incident, what should usually come before root-cause analysis?',
      answer: 'Mitigation: rollback, shed load, fail over',
      distractors: ['Writing the postmortem document', 'Refactoring the failing module', 'Upgrading all of the service’s third-party dependencies'],
      explain: 'Restore service first; investigate calmly afterward.'
    },
    {
      q: 'What does a <strong>flame graph</strong> from continuous profiling show?',
      answer: 'Which functions consume CPU or memory',
      distractors: ['Which users made the most requests', 'Which alerts fired during the past week, and how often', 'Which pods restarted most often'],
      explain: 'Sampled stack traces aggregated into flame graphs pinpoint hot code paths, and before/after comparisons catch regressions.'
    },
    {
      q: 'What is the incident commander’s main job?',
      answer: 'Coordinating responders and making decisions',
      distractors: ['Personally debugging the failing code path', 'Writing the fix and deploying it to production', 'Answering every customer support ticket alone'],
      explain: 'Separating coordination from investigation keeps the response organized; the commander doesn’t debug.'
    },
    {
      q: 'What makes a postmortem <strong>blameless</strong>?',
      answer: 'It focuses on systems and processes, not individuals',
      distractors: ['It is never shared beyond the on-call team', 'It skips the timeline and follow-up actions', 'It assigns the fix and the blame to whoever made the change'],
      explain: 'People share what really happened when they aren’t punished, which surfaces the real systemic weaknesses.'
    },
    {
      q: 'In the lab, how does Prometheus find every replica of the scaled <code>app</code> service?',
      answer: 'DNS service discovery of the app name’s A records',
      distractors: ['Each replica pushes metrics to Prometheus directly', 'Nginx forwards the /metrics path to one replica', 'Grafana sends Prometheus a list of container IDs'],
      explain: 'dns_sd_configs resolves “app” to all replica IPs via Docker’s DNS and scrapes each one.'
    },
    {
      q: 'Why is the tracing setup loaded with <code>node --require ./tracing.js</code>?',
      answer: 'Instrumentation must patch libraries before the app loads them',
      distractors: ['Node.js refuses to run files that contain OpenTelemetry', 'It makes the tracing code run in a separate container next to the app', 'It disables tracing for requests that come from k6'],
      explain: 'Auto-instrumentation hooks module loading; it must start before express, pg and redis are required.'
    },
    {
      q: 'What are MTTD and MTTR?',
      answer: 'Mean time to detect and to recover',
      distractors: ['Maximum traffic and throughput rates', 'Monthly test and training requirements', 'Memory and thread usage ratios'],
      explain: 'How fast you notice and recover often matters more than how rarely things fail.'
    },
    {
      q: 'Why sample high-volume success logs at scale?',
      answer: 'Logging everything can cost more than the servers producing it',
      distractors: ['Success logs are not allowed in production by most providers', 'Sampling makes the logs more accurate than full collection', 'Logging libraries cannot handle more than one line per request'],
      explain: 'Keep full detail for errors and slow requests; sample or aggregate routine successes.'
    }
  ],

  m10: [
    {
      q: 'Why is a <strong>slow</strong> dependency often more dangerous than a dead one?',
      answer: 'Callers’ resources fill with waiting requests',
      distractors: ['Slow services always corrupt the data they return', 'Dead services are restarted automatically by DNS', 'Slow responses cannot be detected by any monitoring'],
      explain: 'A dead dependency fails fast; a slow one holds threads, connections and memory (in-flight = rate × latency), starving unrelated work.'
    },
    {
      q: 'How should a timeout for a dependency be chosen?',
      answer: 'Slightly above its observed high-percentile latency',
      distractors: ['A round number like 60 seconds for every call', 'As long as possible, to avoid any false failures at all', 'Equal to the client’s overall page-load budget'],
      explain: 'Base it on real latency (e.g. just above p99.9) so healthy calls succeed and stuck calls are cut off quickly.'
    },
    {
      q: 'What does <strong>deadline propagation</strong> do?',
      answer: 'Passes the remaining time budget to downstream calls',
      distractors: ['Delays every request until a scheduled deadline', 'Retries a failed call repeatedly until a fixed deadline passes', 'Sends deadlines to users by email notifications'],
      explain: 'Services skip work that can’t finish in time, so nobody computes an answer the user will never receive.'
    },
    {
      q: 'Which error is reasonable to retry?',
      answer: 'A timeout on an idempotent GET',
      distractors: ['A 400 Bad Request response', 'A 404 Not Found for an order that does not exist', 'A 403 Forbidden response'],
      explain: 'Transient failures (timeouts, 503, connection resets) on idempotent operations can succeed on retry; client errors won’t change.'
    },
    {
      q: 'What is a <strong>retry budget</strong>?',
      answer: 'A cap on extra load retries may add (e.g. 10%)',
      distractors: ['The number of engineers allowed to retry deploys', 'The money set aside for failed payment refunds', 'The time window in which retries are disabled'],
      explain: 'When most calls fail, retries can’t help and only amplify load; a budget stops that amplification.'
    },
    {
      q: 'What are <strong>hedged requests</strong>?',
      answer: 'A second copy sent if the first is slow; use whichever answers first',
      distractors: ['Requests that are delayed until the server load drops below a threshold', 'Requests that pay an insurance fee to the provider to be prioritized', 'Requests split across two databases and merged after both respond'],
      explain: 'Sending a backup after (say) the p95 cuts tail latency with little extra load. Only for idempotent reads.'
    },
    {
      q: 'In which circuit-breaker state are calls failed immediately without contacting the dependency?',
      answer: 'Open',
      distractors: ['Closed', 'Half-open', 'Draining'],
      explain: 'Open fails fast (or uses a fallback), giving the dependency time to recover and saving callers’ resources.'
    },
    {
      q: 'What happens in the <strong>half-open</strong> state?',
      answer: 'A few probe calls test whether the dependency recovered',
      distractors: ['Half of all calls are sent to a backup data center', 'The breaker counts errors but never changes state', 'All calls are queued until an operator manually approves them'],
      explain: 'Successful probes close the circuit; a failed probe reopens it for another cool-down.'
    },
    {
      q: 'Why set a <code>volumeThreshold</code> on a circuit breaker?',
      answer: 'So a few failures at low traffic don’t open it',
      distractors: ['So it opens only when traffic volume is zero', 'So it ignores all errors coming from internal callers', 'So the breaker resets every time volume drops'],
      explain: 'With very few calls, one failure can be 100% error rate. A minimum number of calls makes the decision statistically meaningful.'
    },
    {
      q: 'What makes a good circuit-breaker <strong>fallback</strong>?',
      answer: 'A degraded but useful response, like cached or default data',
      distractors: ['Calling the same failing dependency again without a timeout', 'Returning a 200 response with an empty body and no indication', 'Restarting the calling service so it clears its local memory'],
      explain: 'Stale data, generic defaults or a clearly hidden section keep the page working; decide them with product owners in advance.'
    },
    {
      q: 'What does a <strong>bulkhead</strong> do?',
      answer: 'Gives each dependency its own bounded pool of resources',
      distractors: ['Merges every dependency into one shared connection pool', 'Encrypts the network traffic between two services', 'Schedules all background jobs during off-peak hours'],
      explain: 'If one dependency hangs, only its pool fills; other features keep their own capacity.'
    },
    {
      q: 'What is a <strong>cell-based architecture</strong>?',
      answer: 'Independent copies of the stack, each serving a subset of customers',
      distractors: ['A database design that stores each value in its own table cell', 'A mobile-network technique for handing users between antennas', 'An architecture with one central service that every single request must pass through'],
      explain: 'A bad deploy or poison request affects one cell’s customers, not everyone — a large-scale bulkhead.'
    },
    {
      q: 'Which rate-limiting algorithm allows bursts up to a capacity while enforcing an average rate?',
      answer: 'Token bucket',
      distractors: ['Fixed window', 'Leaky bucket', 'Round robin'],
      explain: 'Tokens accumulate up to the bucket size and refill at rate r, so short bursts pass while the long-run rate is capped. (The leaky bucket in its queue form smooths output into a steady stream instead; its “meter” variant is mathematically equivalent to a token bucket.)'
    },
    {
      q: 'What is the main weakness of a <strong>fixed-window</strong> rate limiter?',
      answer: 'Up to twice the limit can pass around a window boundary',
      distractors: ['It requires storing a timestamp for every single request', 'It never allows any requests after the first window ends', 'It cannot be implemented with a simple counter in Redis'],
      explain: 'A client can use the full limit at the end of one window and again at the start of the next.'
    },
    {
      q: 'Why implement a distributed rate limiter as a Redis Lua script?',
      answer: 'Redis runs the whole script atomically',
      distractors: ['Lua scripts bypass Redis memory limits', 'Lua makes Redis replicate faster', 'Scripts are cached in the browser'],
      explain: 'Read-refill-decrement happens without interleaving, so concurrent requests from many instances can’t race.'
    },
    {
      q: 'What should a rate-limited response include?',
      answer: 'Status 429 and a Retry-After header',
      distractors: ['Status 500 and an empty response body', 'Status 200 and a warning inside the body', 'Status 404 so clients stop trying entirely'],
      explain: '429 Too Many Requests with Retry-After tells well-behaved clients exactly when to come back.'
    },
    {
      q: 'Why is limiting by IP address alone problematic?',
      answer: 'Shared NATs punish many users, and botnets use many IPs',
      distractors: ['IP addresses cannot be read behind any kind of load balancer at all', 'Rate limits by IP violate the HTTP/2 specification', 'IPv6 addresses are too long to store in Redis keys'],
      explain: 'Prefer authenticated identities (user, key, tenant), with IP limits as a coarse outer layer.'
    },
    {
      q: 'Why does <strong>load shedding</strong> improve outcomes during overload?',
      answer: 'Rejecting some requests fast lets the rest succeed',
      distractors: ['It makes every request faster by skipping logging', 'It permanently bans clients who send too many requests', 'It doubles the server’s capacity by using more threads'],
      explain: 'An overloaded server that accepts everything builds unbounded queues where every request times out. Shedding keeps latency bounded.'
    },
    {
      q: 'Which requests should be shed first under overload?',
      answer: 'Low-priority ones like analytics beacons and prefetches',
      distractors: ['Checkout and payment requests from paying users', 'Login requests from users who already have active sessions', 'Health checks from the load balancer probes'],
      explain: 'Prioritize: keep critical paths alive and drop work users won’t miss.'
    },
    {
      q: 'What does <strong>graceful degradation</strong> mean?',
      answer: 'Turning off non-critical features to keep core ones working',
      distractors: ['Slowly rolling back every service to an older, more stable release', 'Gradually reducing the number of servers over a week', 'Lowering the SLO target permanently after an incident'],
      explain: 'Stale pages, disabled personalization or a lightweight homepage are far better than errors.'
    },
    {
      q: 'What is <strong>RPO</strong>?',
      answer: 'The maximum acceptable data loss, measured in time',
      distractors: ['The maximum acceptable downtime while the system is recovering', 'The number of replicas required per region', 'The rate at which backups are compressed'],
      explain: 'Recovery Point Objective: e.g. async replication with 5 s lag implies ~5 s of possible data loss. RTO is the downtime target.'
    },
    {
      q: 'Which disaster-recovery strategy has the lowest cost and the longest recovery time?',
      answer: 'Backup and restore',
      distractors: ['Active-active across several regions', 'Warm standby', 'Pilot light'],
      explain: 'Restoring from backups into new infrastructure takes hours; active-active is fastest and most expensive.'
    },
    {
      q: 'What does <strong>static stability</strong> mean?',
      answer: 'Surviving a failure without needing new actions like scaling up',
      distractors: ['Keeping the code unchanged for long stretches of time to avoid bugs', 'Running only static websites without any backend logic', 'Disabling autoscaling permanently in all environments'],
      explain: 'Pre-provision capacity so losing a zone needs no emergency scaling when control planes may be strained.'
    },
    {
      q: 'What is the first step of a chaos-engineering experiment?',
      answer: 'Define measurable steady state',
      distractors: ['Kill a random production database', 'Disable all alerts and dashboards', 'Announce an outage to customers'],
      explain: 'You need a measurable baseline (SLIs) and a hypothesis before injecting faults, plus a limited blast radius and an abort switch.'
    },
    {
      q: 'What is a <strong>game day</strong>?',
      answer: 'A scheduled exercise where a team responds to injected failure',
      distractors: ['A day when all production deploys are completely frozen', 'A load test that is run only against the staging cluster once a quarter', 'A celebration held after a successful product launch'],
      explain: 'It tests runbooks, detection and communication as well as the software.'
    },
    {
      q: 'In the lab, what does Toxiproxy simulate?',
      answer: 'Network faults like added latency to the database',
      distractors: ['A full regional cloud outage with DNS failure', 'A spike of malicious bot traffic at the edge', 'Disk corruption inside the PostgreSQL database container'],
      explain: 'It sits between app and Postgres, letting you add latency and other toxics on demand.'
    },
    {
      q: 'Why does the lab’s rate limiter <strong>fail open</strong> when Redis is unreachable?',
      answer: 'So a limiter outage doesn’t take down the whole API',
      distractors: ['Because Redis outages almost always indicate an ongoing attack', 'So that every request is rejected for safety', 'Because Lua scripts cannot run without Redis'],
      explain: 'A protective component shouldn’t become a single point of failure; edge-level limits still apply.'
    }
  ],

  m11: [
    {
      q: 'Why is security a scaling concern?',
      answer: 'Growth expands the attack surface and attracts automated abuse',
      distractors: ['Security tools stop working above a thousand users', 'Encryption becomes weaker as data volume increases', 'Larger systems are legally exempt from many of the data protection rules'],
      explain: 'More services, APIs, secrets, people and traffic mean more ways in — and more bots trying them.'
    },
    {
      q: 'What does the <strong>STRIDE</strong> mnemonic help with?',
      answer: 'Threat modeling by category of attack',
      distractors: ['Sizing database connection pools', 'Choosing CPU and memory limits for Kubernetes pods', 'Writing SLOs for public APIs'],
      explain: 'Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege — a checklist for “what could go wrong?”.'
    },
    {
      q: 'What is the main defense against a multi-hundred-gigabit volumetric flood?',
      answer: 'Absorbing it at a provider with huge anycast capacity',
      distractors: ['Adding more replicas of the application servers', 'Lowering the TTL on the site’s DNS records', 'Enabling gzip compression on all of the HTTP responses it serves'],
      explain: 'Your own links would saturate long before your servers matter; large networks absorb and scrub the flood at the edge.'
    },
    {
      q: 'What makes <strong>application-layer</strong> (L7) DDoS attacks hard to block?',
      answer: 'The requests look like legitimate HTTP traffic',
      distractors: ['They use encrypted UDP packets only', 'They always come from one single, easily blocked IP address', 'They target DNS servers exclusively'],
      explain: 'Valid-looking requests to expensive endpoints need WAF rules, rate limits, bot detection and caching to filter.'
    },
    {
      q: 'What is an “economic denial of service”?',
      answer: 'Unlimited autoscaling turning an attack into a huge bill',
      distractors: ['Raising prices so attackers cannot afford access', 'An attack targeting a company’s payment provider', 'Blocking customers in countries with lower average incomes entirely'],
      explain: 'Pair autoscaling with maximums, cost alerts and edge filtering.'
    },
    {
      q: 'Why lock your origin so it only accepts traffic from the CDN?',
      answer: 'Attackers can otherwise bypass edge defenses',
      distractors: ['CDNs refuse to cache unlocked origins', 'It makes TLS handshakes faster for users around the world', 'It removes the need for any rate limits'],
      explain: 'If the origin is directly reachable, WAF and DDoS protection at the CDN are trivially sidestepped.'
    },
    {
      q: 'What can a WAF <strong>not</strong> reliably protect you from?',
      answer: 'Broken access control in your own logic',
      distractors: ['Known SQL-injection payload patterns', 'Oversized request bodies sent by bots', 'Requests that use unusual or unsupported HTTP methods'],
      explain: 'A WAF matches patterns; it can’t know that user A shouldn’t see order 981. Broken access control tops the OWASP Top 10 (2021).'
    },
    {
      q: 'What is <strong>credential stuffing</strong>?',
      answer: 'Replaying leaked username/password pairs at scale',
      distractors: ['Storing too many credentials in one secret vault', 'Guessing passwords one letter at a time, manually, by hand', 'Sharing one admin password across a whole team'],
      explain: 'Reused passwords from other breaches are tried against your login by bots. MFA, breached-password checks and per-account limits help.'
    },
    {
      q: 'Why rate-limit logins per <strong>account</strong>, not just per IP?',
      answer: 'Attackers spread attempts across thousands of IPs',
      distractors: ['Per-IP limits are unsupported by all load balancers', 'Accounts are faster to look up than IP addresses', 'Per-account limits remove the need for passwords'],
      explain: 'Distributed attacks stay under per-IP limits; per-account limits (plus global failure-rate alerts) catch the pattern.'
    },
    {
      q: 'What is the difference between authentication and authorization?',
      answer: 'AuthN establishes who; AuthZ decides what they may do',
      distractors: ['AuthN encrypts the traffic; AuthZ compresses the responses afterwards', 'AuthN happens in browsers; AuthZ only in databases', 'They are two names for the very same process'],
      explain: 'Both are needed at every service: verify identity, then check permission for the specific action and object.'
    },
    {
      q: 'Why can every service verify a JWT locally without calling a session store?',
      answer: 'The signature is checked with the issuer’s public keys',
      distractors: ['JWTs are encrypted with a password shared by all users', 'Every service keeps a copy of all active sessions', 'Browsers validate tokens before sending them'],
      explain: 'Services fetch the provider’s public keys (JWKS) and verify signatures, issuer, audience and expiry locally.'
    },
    {
      q: 'Why keep access tokens short-lived?',
      answer: 'Self-contained tokens are hard to revoke early',
      distractors: ['Long-lived tokens are rejected by most HTTP/2 servers', 'Short tokens are smaller and faster to sign', 'Browsers delete tokens after five minutes'],
      explain: 'A stolen token works until it expires. Short lifetimes plus refresh tokens limit the window.'
    },
    {
      q: 'An API returns order 981 to any logged-in user who asks for it. What flaw is this?',
      answer: 'Missing object-level authorization (IDOR/BOLA)',
      distractors: ['A cross-site scripting vulnerability', 'A volumetric denial-of-service attack', 'An expired TLS certificate on the API’s load balancer'],
      explain: 'Being authenticated isn’t enough; the server must check the caller owns or may access that specific object.'
    },
    {
      q: 'Which authorization model derives permissions from relationships, like “editor of the parent folder”?',
      answer: 'ReBAC',
      distractors: ['RBAC', 'ACID', 'CORS'],
      explain: 'Relationship-based access control, as in Google’s Zanzibar and OpenFGA/SpiceDB. RBAC uses roles; ABAC uses attributes.'
    },
    {
      q: 'Why shouldn’t internal services skip authorization because “the gateway already checked”?',
      answer: 'A compromised internal component could act as anyone',
      distractors: ['Gateways cannot verify tokens of any kind', 'Internal calls are slower when unauthorized', 'Services must re-authenticate every user by password'],
      explain: 'Propagate the user’s identity and authorize at each service — zero trust rather than trusting the network.'
    },
    {
      q: 'Where should application secrets live?',
      answer: 'In a central secret store, injected at runtime',
      distractors: ['In the Git repository, in a private folder', 'In the container image, as environment values', 'In a shared spreadsheet that the team maintains'],
      explain: 'Vaults and cloud secret managers provide access control, auditing and rotation; code, images and docs leak.'
    },
    {
      q: 'What is the benefit of <strong>dynamic</strong> database credentials?',
      answer: 'A leaked credential expires on its own',
      distractors: ['They make every database query run noticeably faster', 'They remove the need for any TLS', 'They can be shared safely in logs'],
      explain: 'A secret store can mint short-lived credentials per service, limiting the damage of any leak.'
    },
    {
      q: 'What is <strong>envelope encryption</strong>?',
      answer: 'Data keys encrypt data; a KMS master key encrypts the data keys',
      distractors: ['Encrypting data twice with the same key for extra safety', 'Wrapping JSON payloads inside an XML envelope for safer transport over HTTP', 'Sending encrypted emails that contain the decryption key'],
      explain: 'The master key never leaves the KMS, and rotating or revoking it controls access to all wrapped data keys.'
    },
    {
      q: 'What is the core assumption of <strong>zero trust</strong>?',
      answer: 'The network is hostile; authenticate every request',
      distractors: ['Internal networks behind the firewall can be trusted completely', 'Only the database needs any access control', 'Users must never be trusted with passwords'],
      explain: 'Identity, not network location, grants access: workload identities, mTLS and least privilege everywhere.'
    },
    {
      q: 'What does mutual TLS add over ordinary TLS?',
      answer: 'The client also presents a certificate proving its identity',
      distractors: ['Traffic is encrypted twice for twice the protection', 'The certificate is shared by both sides of the call', 'The connection skips the TLS handshake entirely on each new request'],
      explain: 'Both sides authenticate, so services know exactly which workload is calling — typically automated by a service mesh.'
    },
    {
      q: 'Why is <strong>tokenization</strong> used for card numbers?',
      answer: 'Most systems handle opaque tokens, not the real data',
      distractors: ['Tokens make card payments process faster', 'Tokenization compresses the card data so it is cheaper to store', 'Card networks require cards to be shortened'],
      explain: 'Only a tightly controlled vault holds the sensitive value, shrinking the scope of compliance and breaches.'
    },
    {
      q: 'In PostgreSQL, who bypasses row-level security by default?',
      answer: 'Superusers, and table owners unless FORCE is set',
      distractors: ['Every user who connects from localhost', 'Any role that has the SELECT privilege', 'Connections that go through PgBouncer’s transaction pooling'],
      explain: 'Applications must connect as an unprivileged role for RLS to protect tenants.'
    },
    {
      q: 'Why does the RLS lab’s query fail when <code>app.tenant_id</code> isn’t set?',
      answer: 'It fails loudly instead of returning every tenant’s rows',
      distractors: ['PostgreSQL forbids queries without a WHERE clause', 'The orders table has been dropped by the policy creation step', 'The app_user role has no permission to log in'],
      explain: 'current_setting errors when the variable is missing — a safe failure for a code path that forgot to set the tenant.'
    },
    {
      q: 'What is an <strong>SBOM</strong>?',
      answer: 'A list of components and dependencies in a build',
      distractors: ['A server benchmark used for operations and capacity monitoring', 'A secret bundle for onboarding new machines', 'A signed backup of the main database'],
      explain: 'A software bill of materials lets you answer “are we affected?” within minutes when a new vulnerability is announced.'
    },
    {
      q: 'Why pin third-party CI actions to commit hashes?',
      answer: 'A compromised tag can’t silently change what runs',
      distractors: ['Hashes make the CI pipeline run much faster', 'CI systems reject any action that is referenced by a tag', 'Hashes encrypt the action’s source code'],
      explain: 'Tags can be moved to malicious code; a commit hash is immutable.'
    },
    {
      q: 'Why use <code>npm ci</code> with a lockfile in builds?',
      answer: 'Reproducible installs that don’t pick up new versions silently',
      distractors: ['It installs packages directly from the developer’s laptop over the network', 'It skips downloading dependencies to make builds faster', 'It automatically fixes every vulnerability in the tree'],
      explain: 'Lockfiles pin exact versions, so a malicious or broken new release isn’t pulled in unnoticed.'
    },
    {
      q: 'Why return the same error for “unknown user” and “wrong password”?',
      answer: 'To avoid revealing which accounts exist',
      distractors: ['To make login responses cacheable', 'Because HTTP has only one possible 401 message text', 'To reduce the size of the response'],
      explain: 'Different messages let attackers enumerate valid accounts before stuffing passwords.'
    }
  ],

  m12: [
    {
      q: 'In the TicketRush design, what is the “hardest number”?',
      answer: 'Contended writes on one event’s inventory, plus the rush to checkout',
      distractors: ['The total number of static page views served by the CDN', 'The number of email confirmations sent after the on-sale', 'The storage needed for all the event images over the next decade or so'],
      explain: 'A CDN absorbs page views. The scarce, strongly consistent resource — one event’s seats — is the real bottleneck.'
    },
    {
      q: 'Why does TicketRush put a <strong>virtual waiting room</strong> in front of checkout?',
      answer: 'Admission control at a rate checkout can sustain, fairly',
      distractors: ['To cache seat selections so the database is never used', 'To replace the payment provider with a cheaper alternative', 'To make the event page load faster for every visitor'],
      explain: 'It’s load shedding made friendly: the crowd waits cheaply on the CDN while a controlled flow reaches the contended path.'
    },
    {
      q: 'Checkout can hold 10,000 concurrent shoppers who each take 4 minutes. What admission rate does Little’s Law allow?',
      answer: '2,500 per minute',
      distractors: ['40,000 per minute', '10,000 per minute', '400 per minute'],
      explain: 'λ = L ÷ W = 10,000 ÷ 4 min = 2,500 shoppers admitted per minute.'
    },
    {
      q: 'How does the gateway stop users from skipping the waiting room?',
      answer: 'It requires a signed, short-lived admission token',
      distractors: ['It hides the checkout URL inside obfuscated JavaScript', 'It blocks every request that arrives before 10:00', 'It checks that the user’s browser window is in focus'],
      explain: 'Without a valid token bound to the session, inventory and order requests are rejected.'
    },
    {
      q: 'Why do waiting pages poll their status endpoint with <strong>jittered</strong> intervals?',
      answer: 'To avoid synchronized thundering herds',
      distractors: ['To make everyone’s positions in the queue random', 'To keep the browser tab from sleeping', 'To reduce the size of each response'],
      explain: 'If millions poll on the same second boundary, they create self-inflicted spikes. Jitter spreads them out.'
    },
    {
      q: 'What guarantees TicketRush never sells a seat twice?',
      answer: 'An atomic conditional update in the database',
      distractors: ['A Redis cache of seat availability counts', 'A CDN rule that blocks duplicate requests at the edge', 'A frontend check that greys out sold seats'],
      explain: 'UPDATE … WHERE status = \'available\' (with row locks) makes the check and the change indivisible; caches and UIs are only hints.'
    },
    {
      q: 'Why does the hold query use <code>FOR UPDATE SKIP LOCKED</code>?',
      answer: 'Losing buyers fail fast instead of queueing on locks',
      distractors: ['It allows two different buyers to hold the very same seat safely', 'It releases expired holds automatically on read', 'It replicates the hold to every read replica'],
      explain: 'Under heavy contention, waiting on other buyers’ locks wastes time; skipping lets the app offer alternatives immediately.'
    },
    {
      q: 'Where do the displayed “seats remaining” counts come from?',
      answer: 'A derived, slightly stale projection in Redis',
      distractors: ['A COUNT(*) on the seats table, run fresh for every page view', 'The browser’s local storage on each device', 'The payment provider’s confirmation webhook'],
      explain: 'Counts are hints that can be a second stale; the hold query is the source of truth.'
    },
    {
      q: 'All inventory writes target one event. What Module 04 risk does this create?',
      answer: 'A hot partition',
      distractors: ['Replication lag on reads', 'A cache stampede', 'An N+1 query'],
      explain: 'Partition by event, keep rows narrow and indexed, and split a huge event by section so independent sections don’t contend.'
    },
    {
      q: 'How is payment structured in TicketRush?',
      answer: 'As a saga with idempotent steps and compensations',
      distractors: ['As a two-phase commit transaction spanning the payment provider', 'As a synchronous call inside the seat-hold query', 'As a nightly batch job that charges all holds'],
      explain: 'Order → charge → confirm, each idempotent; failures trigger compensations such as releasing seats or refunding.'
    },
    {
      q: 'The payment provider times out. What should the system do?',
      answer: 'Treat the outcome as unknown and verify before deciding',
      distractors: ['Release the seats at once and tell the user that payment failed', 'Charge the card again immediately with a new key', 'Mark the order as confirmed and send the tickets'],
      explain: 'A timeout doesn’t mean failure. Query by idempotency key or await the webhook; guessing causes double charges or oversells.'
    },
    {
      q: 'Why pass the order ID to the payment provider as its idempotency key?',
      answer: 'Retries can’t create a second charge',
      distractors: ['It makes card payments clear faster', 'Providers require numeric order IDs', 'It hides the amount from the provider'],
      explain: 'The provider recognizes repeated attempts for the same order and returns the original result.'
    },
    {
      q: 'Why are holds released by a worker with a <strong>conditional</strong> update?',
      answer: 'So a seat sold at the last second isn’t released',
      distractors: ['So expired holds are never released at all', 'So holds can be extended by any user who asks for more time', 'So the worker can skip the database entirely'],
      explain: 'Release only WHERE status = \'held\' AND expired — the same check-and-set discipline as the hold itself.'
    },
    {
      q: 'Why pre-scale before a known 10:00 on-sale instead of relying on autoscaling?',
      answer: 'Reactive autoscaling takes minutes to add capacity',
      distractors: ['Autoscaling is disabled during business hours', 'Pre-scaling is cheaper than any autoscaling', 'Autoscalers cannot scale stateless services during an on-sale'],
      explain: 'Module 08’s delays stack up; for a known spike, scheduled capacity is ready before the first request.'
    },
    {
      q: 'Why make the inventory database’s standby <strong>synchronous</strong>?',
      answer: 'Failover then loses no acknowledged holds or orders',
      distractors: ['Synchronous replicas serve reads with zero load', 'It doubles the write throughput of the primary database server', 'It removes the need for any backups at all'],
      explain: 'For correctness-critical data, RPO = 0 is worth the extra commit latency.'
    },
    {
      q: 'Redis fails during the on-sale. What should happen to seat holds?',
      answer: 'Nothing — holds live in the database, not Redis',
      distractors: ['All holds are lost and every buyer must start again from the beginning', 'The on-sale must be cancelled immediately', 'Holds switch to being stored in browsers'],
      explain: 'Redis holds only derived counts and rate-limit state; the source of truth is unaffected, so the purchase path keeps working.'
    },
    {
      q: 'Which practice guards against a bad deploy ruining the on-sale?',
      answer: 'A change freeze, with canaries the day before',
      distractors: ['Deploying every service at 09:55 to be fresh', 'Disabling monitoring to reduce system overhead', 'Doubling the number of releases on the day'],
      explain: 'Most outages come from changes; freeze changes during critical events and validate them in advance.'
    },
    {
      q: 'Why load-test with <strong>slow and flaky</strong> payment-provider stubs?',
      answer: 'To verify breakers, timeouts and holds under realistic failures',
      distractors: ['Because real payment providers forbid any form of load testing at all', 'Because fast stubs always crash the test environment', 'Because flaky stubs make the test run more cheaply'],
      explain: 'Happy-path load tests miss the failure behavior that actually decides how an on-sale goes.'
    },
    {
      q: 'What is the right <strong>v1</strong> for a startup selling tickets for small venues?',
      answer: 'A modular monolith, one Postgres primary + standby, atomic holds, CDN',
      distractors: ['Microservices, multi-region active-active and Kafka, all from day one', 'A NoSQL database with no transactions to maximize speed', 'Serverless functions writing directly to a shared spreadsheet'],
      explain: 'The simplest design that meets requirements already never oversells; add complexity as measurements demand.'
    },
    {
      q: 'Which habit summarizes the whole course?',
      answer: 'Measure, find the bottleneck, apply the simplest fix, repeat',
      distractors: ['Adopt the newest architecture trend for every new project', 'Shard every database from the very first day of a product', 'Add more servers whenever any single metric looks even slightly unusual'],
      explain: 'Every ladder in the course — database, caching, services — is climbed only as far as the numbers require.'
    },
    {
      q: 'Why serve the event page and waiting room from the CDN?',
      answer: 'Millions of waiting users then cost almost nothing',
      distractors: ['CDNs can sell tickets on your behalf directly', 'It guarantees that every user gets a ticket', 'CDNs store the customers’ payment details more securely than origins'],
      explain: '“Make the crowd cheap”: static, cached pages absorb the flash crowd so only admitted users reach origin compute.'
    },
    {
      q: 'Why give early arrivals a <strong>random</strong> position at on-sale time?',
      answer: 'It’s fairer than rewarding whoever reloaded fastest',
      distractors: ['Random positions are much faster for the servers to compute', 'It guarantees bots always go last', 'Browsers cannot store queue positions'],
      explain: 'Everyone who was there before the start gets an equal chance, which also removes the incentive to hammer refresh.'
    },
    {
      q: 'In a design review, how should trade-offs be presented?',
      answer: 'Explicitly, naming the costs and mitigations of each choice',
      distractors: ['Hidden, so the design seems simpler to reviewers', 'Only after the system has been fully implemented', 'As a list of technologies used, without any justification or reasoning'],
      explain: 'Reviewers trust designs whose costs are named and addressed.'
    }
  ]
};

/* ---------------------------------------------------------------------------
 * 3. Store — every access is guarded; the page works without storage.
 * ------------------------------------------------------------------------ */
const Store = (() => {
  const KEY = 'scalecraft:v1';
  let state = { visited: {}, answers: {}, last: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(state, JSON.parse(raw));
  } catch (_) { /* storage unavailable — keep in-memory state */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} };
  return {
    get: () => state,
    markVisited(id) { if (!state.visited[id]) { state.visited[id] = true; save(); return true; } return false; },
    setLast(id) { state.last = id; save(); },
    answer(moduleId, qIndex, optionText) { (state.answers[moduleId] ||= {})[qIndex] = optionText; save(); },
    resetModule(moduleId) { delete state.answers[moduleId]; save(); },
    resetAll() { state = { visited: {}, answers: {}, last: null }; save(); }
  };
})();

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const LETTERS = ['A', 'B', 'C', 'D'];

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

// Deterministic PRNG so option order is stable across reloads (answers stay valid).
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------------------------------------------------------------------------
 * 4. Quiz engine
 * ------------------------------------------------------------------------ */

/**
 * Balanced placement: build a slot list [0,1,2,3,0,1,2,3,…] of length n,
 * shuffle it, and give question i its correct answer at slot[i]. Every letter
 * therefore holds the correct answer either ⌊n/4⌋ or ⌈n/4⌉ times, in an
 * unpredictable order. Distractors are shuffled into the remaining slots.
 */
function buildQuiz(moduleId, questions) {
  const rand = mulberry32(hashString(moduleId));
  const slots = shuffle(questions.map((_, i) => i % 4), rand);
  return questions.map((q, i) => {
    const options = shuffle([...q.distractors], rand);
    options.splice(slots[i], 0, q.answer);
    return { ...q, options, correctIndex: slots[i] };
  });
}

function validateBank() {
  Object.entries(QUIZ_BANK).forEach(([id, qs]) => {
    qs.forEach((q, i) => {
      const all = [q.answer, ...q.distractors];
      if (q.distractors.length !== 3 || new Set(all).size !== 4) {
        console.warn(`[quiz] ${id} #${i + 1} must have one answer and 3 distinct distractors`);
      }
    });
  });
}

const BUILT_QUIZZES = {};

function renderQuiz(container) {
  const moduleId = container.dataset.quiz;
  const bank = QUIZ_BANK[moduleId];
  if (!bank) { container.innerHTML = '<p class="text-nf-muted">Quiz coming soon.</p>'; return; }
  const quiz = BUILT_QUIZZES[moduleId] ||= buildQuiz(moduleId, bank);

  const scoreBar = el('div', 'sticky top-16 z-20 -mx-1 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-nf-line bg-nf-bg/95 px-4 py-3 backdrop-blur');
  scoreBar.innerHTML = `
    <div class="flex items-center gap-4">
      <span class="font-display text-2xl tracking-wide text-white" data-score>0 / ${quiz.length}</span>
      <span class="text-xs text-nf-muted" data-answered>0 of ${quiz.length} answered</span>
    </div>
    <div class="flex items-center gap-3">
      <div class="hidden h-1 w-32 overflow-hidden rounded bg-neutral-700 sm:block"><div class="h-full w-0 bg-nf-red transition-all" data-quiz-bar></div></div>
      <button type="button" class="rounded-sm border border-neutral-600 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:border-white hover:text-white" data-quiz-reset>Retake quiz</button>
    </div>`;
  container.replaceChildren(scoreBar);

  const list = el('ol', 'space-y-5');
  quiz.forEach((q, qi) => list.appendChild(renderQuestion(moduleId, q, qi, quiz.length)));
  container.appendChild(list);

  const summary = el('div', 'mt-8 hidden rounded-md border border-nf-red/50 bg-gradient-to-r from-[#2a0507] to-nf-card p-6');
  summary.dataset.quizSummary = '';
  container.appendChild(summary);

  scoreBar.querySelector('[data-quiz-reset]').addEventListener('click', () => {
    Store.resetModule(moduleId);
    renderQuiz(container);
    Progress.refresh();
  });

  restoreAnswers(container, moduleId);
  updateScore(container, moduleId);
}

function renderQuestion(moduleId, q, qi, total) {
  const li = el('li', 'overflow-hidden rounded-md border border-nf-line bg-nf-card transition-colors');
  li.dataset.qIndex = qi;
  const panelId = `${moduleId}-q${qi}-explain`;
  li.innerHTML = `
    <div class="p-5 sm:p-6">
      <p class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-nf-muted">Question ${qi + 1} <span class="text-neutral-600">/ ${total}</span></p>
      <p class="text-base font-medium leading-relaxed text-white sm:text-lg [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]">${q.q}</p>
      <div class="mt-5 grid gap-2.5" role="group" aria-label="Answer options">
        ${q.options.map((opt, oi) => `
          <button type="button" data-option="${oi}"
            class="group flex w-full items-start gap-3 rounded border border-neutral-700 bg-black/30 px-4 py-3 text-left text-[0.95rem] text-neutral-200 transition hover:border-neutral-400 hover:bg-white/5 disabled:cursor-default disabled:hover:bg-black/30 [&_code]:font-mono [&_code]:text-[0.85em]">
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-sm bg-neutral-700 font-display text-base leading-none text-white transition" data-letter>${LETTERS[oi]}</span>
            <span class="pt-0.5">${opt}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="border-t border-nf-line">
      <button type="button" class="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-semibold text-neutral-300 transition hover:bg-white/5 hover:text-white sm:px-6"
        aria-expanded="false" aria-controls="${panelId}" data-reveal>
        <span data-reveal-label>Reveal answer &amp; explanation</span>
        <svg class="h-5 w-5 transition-transform duration-300" data-chevron viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div id="${panelId}" class="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out" data-panel-wrap>
        <div class="overflow-hidden">
          <div class="px-5 pb-5 sm:px-6">
            <p class="mb-2 text-sm"><span class="font-semibold text-nf-green">Correct answer: ${LETTERS[q.correctIndex]}</span>
              <span class="text-neutral-300"> — ${q.answer}</span></p>
            <p class="text-sm leading-relaxed text-neutral-400 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:font-mono [&_code]:text-neutral-200">${q.explain}</p>
          </div>
        </div>
      </div>
    </div>`;

  li.querySelectorAll('[data-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const oi = Number(btn.dataset.option);
      Store.answer(moduleId, qi, q.options[oi]);
      lockQuestion(li, q, oi);
      toggleReveal(li, true);
      updateScore(li.closest('[data-quiz]'), moduleId);
      Progress.refresh();
    });
  });
  li.querySelector('[data-reveal]').addEventListener('click', () => toggleReveal(li));
  return li;
}

function lockQuestion(li, q, chosen) {
  const isRight = chosen === q.correctIndex;
  li.classList.add(isRight ? 'border-nf-green/60' : 'border-nf-red/60');
  li.querySelectorAll('[data-option]').forEach((btn) => {
    const oi = Number(btn.dataset.option);
    const letter = btn.querySelector('[data-letter]');
    btn.disabled = true;
    if (oi === q.correctIndex) {
      btn.classList.add('!border-nf-green', '!bg-nf-green/10', 'text-white');
      letter.classList.replace('bg-neutral-700', 'bg-nf-green');
      letter.textContent = '✓';
    } else if (oi === chosen) {
      btn.classList.add('!border-nf-red', '!bg-nf-red/10');
      letter.classList.replace('bg-neutral-700', 'bg-nf-red');
      letter.textContent = '✕';
    } else {
      btn.classList.add('opacity-50');
    }
  });
  li.querySelector('[data-reveal-label]').textContent = isRight ? 'Correct! Why it’s right' : 'Not quite — see the explanation';
}

function toggleReveal(li, force) {
  const btn = li.querySelector('[data-reveal]');
  const open = force ?? btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  li.querySelector('[data-panel-wrap]').classList.toggle('grid-rows-[1fr]', open);
  li.querySelector('[data-panel-wrap]').classList.toggle('grid-rows-[0fr]', !open);
  li.querySelector('[data-chevron]').classList.toggle('rotate-180', open);
}

function restoreAnswers(container, moduleId) {
  const saved = Store.get().answers[moduleId] || {};
  const quiz = BUILT_QUIZZES[moduleId];
  Object.entries(saved).forEach(([qi, text]) => {
    const q = quiz[qi];
    const oi = q ? q.options.indexOf(text) : -1;
    if (oi < 0) return; // question content changed since the answer was saved
    const li = container.querySelector(`[data-q-index="${qi}"]`);
    lockQuestion(li, q, oi);
    toggleReveal(li, true);
  });
}

function quizStats(moduleId) {
  const quiz = BUILT_QUIZZES[moduleId] || (QUIZ_BANK[moduleId] ? buildQuiz(moduleId, QUIZ_BANK[moduleId]) : []);
  const saved = Store.get().answers[moduleId] || {};
  let answered = 0, correct = 0;
  quiz.forEach((q, qi) => {
    if (saved[qi] == null) return;
    const oi = q.options.indexOf(saved[qi]);
    if (oi < 0) return;
    answered++;
    if (oi === q.correctIndex) correct++;
  });
  return { total: quiz.length, answered, correct };
}

function updateScore(container, moduleId) {
  const { total, answered, correct } = quizStats(moduleId);
  container.querySelector('[data-score]').textContent = `${correct} / ${total}`;
  container.querySelector('[data-answered]').textContent = `${answered} of ${total} answered`;
  container.querySelector('[data-quiz-bar]').style.width = `${(answered / total) * 100}%`;
  const summary = container.querySelector('[data-quiz-summary]');
  if (answered === total) {
    const pct = Math.round((correct / total) * 100);
    const verdict = pct >= 90 ? 'Outstanding. You’re ready for the next module.'
      : pct >= 70 ? 'Solid grasp. Revisit the explanations you missed, then move on.'
      : 'Worth a second pass — re-read the sections behind the questions you missed.';
    summary.innerHTML = `
      <p class="font-display text-lg tracking-[0.3em] text-nf-red">Quiz complete</p>
      <p class="mt-1 font-display text-5xl tracking-wide text-white">${pct}%</p>
      <p class="mt-2 text-neutral-300">${correct} of ${total} correct. ${verdict}</p>`;
    summary.classList.remove('hidden');
  } else {
    summary.classList.add('hidden');
  }
}

/* ---------------------------------------------------------------------------
 * 5. Navigation — module row, coming-soon placeholders, TOC, drawer
 * ------------------------------------------------------------------------ */
function renderComingSoon() {
  const content = $('#course-content');
  let anchor = null;
  COURSE_MODULES.forEach((m) => {
    const existing = document.getElementById(m.id);
    if (existing) { anchor = existing; return; }
    const art = el('article', 'mt-24 scroll-mt-20');
    art.id = m.id;
    art.dataset.module = m.id;
    art.innerHTML = `
      <header class="overflow-hidden rounded-md border border-nf-line bg-nf-card">
        <div class="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-10">
          <span class="font-display text-[7rem] leading-[0.8] text-transparent [-webkit-text-stroke:2px_#3a3a3a] sm:text-[9rem]">${m.number}</span>
          <div class="min-w-0">
            <p class="font-display text-lg tracking-[0.3em] text-nf-muted">Module ${m.number} · <span class="text-nf-red">Coming soon</span></p>
            <h2 class="mt-1 font-display text-4xl leading-none tracking-wide text-neutral-300 sm:text-5xl">${m.title}</h2>
            <p class="mt-3 text-neutral-400">${m.blurb}</p>
            <ul class="mt-4 flex flex-wrap gap-2">
              ${(m.topics || []).map((t) => `<li class="rounded-sm bg-white/5 px-2.5 py-1 text-xs text-neutral-400">${t}</li>`).join('')}
            </ul>
          </div>
        </div>
      </header>`;
    if (anchor) anchor.after(art); else content.appendChild(art);
    anchor = art;
  });
}

function moduleSubsections(moduleId) {
  return $$(`#${moduleId} [data-subsection]`);
}

function renderModuleRow() {
  const row = $('#module-row');
  row.innerHTML = COURSE_MODULES.map((m) => {
    const soon = m.status !== 'ready';
    return `
      <a href="#${m.id}" class="group/card relative flex shrink-0 snap-start items-end" data-row-card="${m.id}">
        <span class="pointer-events-none -mr-5 select-none font-display text-[7rem] leading-[0.75] text-nf-bg [-webkit-text-stroke:2px_#595959] sm:-mr-6 sm:text-[11rem] sm:[-webkit-text-stroke:3px_#595959]">${Number(m.number)}</span>
        <div class="relative w-40 overflow-hidden rounded-md border border-nf-line bg-nf-card shadow-lg shadow-black/60 transition duration-300 group-hover/card:z-10 group-hover/card:scale-105 group-hover/card:border-neutral-500 sm:w-48">
          <div class="relative h-24 bg-gradient-to-br ${soon ? 'from-neutral-800 to-neutral-900' : 'from-nf-red via-nf-darkred to-black'} p-3 sm:h-28">
            <span class="font-display text-sm tracking-[0.25em] text-white/70">S · ${m.number}</span>
            <p class="mt-1 font-display text-2xl leading-none tracking-wide text-white">${m.short}</p>
            ${soon ? '<span class="absolute bottom-2 left-3 rounded-sm bg-black/70 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-nf-red">Coming soon</span>' : ''}
          </div>
          <div class="p-3">
            <p class="line-clamp-2 text-xs leading-snug text-neutral-400">${m.blurb}</p>
            <p class="mt-2 text-[0.7rem] font-semibold text-neutral-500">${m.duration}</p>
          </div>
          <div class="h-1 w-full bg-neutral-700"><div class="h-full w-0 bg-nf-red transition-all duration-500" data-row-progress="${m.id}"></div></div>
        </div>
      </a>`;
  }).join('');

  $$('[data-row-scroll]').forEach((btn) => btn.addEventListener('click', () => {
    row.scrollBy({ left: Number(btn.dataset.rowScroll) * row.clientWidth * 0.8, behavior: 'smooth' });
  }));
  $$('[data-module-count]').forEach((n) => { n.textContent = COURSE_MODULES.length; });
}

function renderTOC() {
  const html = COURSE_MODULES.map((m) => {
    const soon = m.status !== 'ready';
    const subs = soon ? [] : moduleSubsections(m.id);
    return `
      <div class="mb-1" data-toc-module="${m.id}">
        <a href="#${m.id}" class="flex items-start gap-3 rounded px-2 py-2.5 transition hover:bg-white/5 ${soon ? 'opacity-50' : ''}" data-toc-link="${m.id}">
          <span class="w-7 shrink-0 pt-0.5 font-display text-2xl leading-none text-neutral-500">${m.number}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold leading-snug text-neutral-200">${m.title}</span>
            <span class="mt-0.5 block text-xs text-nf-muted">${soon ? 'Coming soon' : m.duration}</span>
            ${soon ? '' : `<span class="mt-2 block h-0.5 w-full overflow-hidden rounded bg-neutral-700"><span class="block h-full w-0 bg-nf-red transition-all duration-500" data-toc-progress="${m.id}"></span></span>`}
          </span>
        </a>
        ${subs.length ? `
        <ul class="mb-2 ml-[2.6rem] hidden border-l border-nf-line" data-toc-subs="${m.id}">
          ${subs.map((s) => `
            <li>
              <a href="#${s.id}" class="-ml-px flex items-center gap-2 border-l-2 border-transparent py-1.5 pl-3 pr-2 text-[0.8rem] leading-snug text-neutral-400 transition hover:text-white" data-toc-sub="${s.id}">
                <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-600" data-visited-dot="${s.id}"></span>
                <span>${s.dataset.title}</span>
              </a>
            </li>`).join('')}
        </ul>` : ''}
      </div>`;
  }).join('');
  $$('[data-toc]').forEach((toc) => { toc.innerHTML = html; });
}

const Drawer = (() => {
  const drawer = $('#drawer');
  const overlay = $('#drawer-overlay');
  const openBtn = $('#drawer-open');
  function set(open) {
    drawer.classList.toggle('-translate-x-full', !open);
    drawer.setAttribute('aria-hidden', String(!open));
    openBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('overflow-hidden', open);
    if (open) {
      overlay.classList.remove('hidden');
      requestAnimationFrame(() => overlay.classList.add('opacity-100'));
      $('#drawer-close').focus();
    } else {
      overlay.classList.remove('opacity-100');
      setTimeout(() => overlay.classList.add('hidden'), 300);
    }
  }
  function init() {
    openBtn.addEventListener('click', () => set(true));
    $('#drawer-close').addEventListener('click', () => set(false));
    overlay.addEventListener('click', () => set(false));
    drawer.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }
  return { init };
})();

/* ---------------------------------------------------------------------------
 * 6. Progress — reading (subsection seen) + quiz answers
 * ------------------------------------------------------------------------ */
const Progress = (() => {
  function moduleProgress(m) {
    if (m.status !== 'ready') return null;
    const subs = moduleSubsections(m.id).filter((s) => !s.id.endsWith('-quiz'));
    const visited = subs.filter((s) => Store.get().visited[s.id]).length;
    const { total, answered } = quizStats(m.id);
    return { done: visited + answered, total: subs.length + total };
  }

  function refresh() {
    let done = 0, total = 0;
    COURSE_MODULES.forEach((m) => {
      const p = moduleProgress(m);
      if (!p) return;
      done += p.done; total += p.total;
      const pct = `${p.total ? (p.done / p.total) * 100 : 0}%`;
      $$(`[data-toc-progress="${m.id}"], [data-row-progress="${m.id}"]`).forEach((b) => { b.style.width = pct; });
    });
    Object.keys(Store.get().visited).forEach((id) => {
      $$(`[data-visited-dot="${id}"]`).forEach((d) => d.classList.replace('bg-neutral-600', 'bg-nf-red'));
    });
    const pct = total ? Math.round((done / total) * 100) : 0;
    $$('[data-overall-label]').forEach((n) => { n.textContent = `${pct}%`; });
    $$('[data-overall-bar]').forEach((n) => { n.style.width = `${pct}%`; });
    $$('[data-overall-detail]').forEach((n) => { n.textContent = `${done} of ${total} lessons & questions`; });
    $('#nav-progress-label').textContent = `${pct}%`;
  }

  function setActive(sectionId) {
    const moduleId = sectionId.split('-')[0];
    $$('[data-toc-sub]').forEach((a) => {
      const on = a.dataset.tocSub === sectionId;
      a.classList.toggle('!border-nf-red', on);
      a.classList.toggle('text-white', on);
      a.classList.toggle('font-semibold', on);
    });
    $$('[data-toc-subs]').forEach((ul) => ul.classList.toggle('hidden', ul.dataset.tocSubs !== moduleId));
    $$('[data-toc-link]').forEach((a) => a.classList.toggle('bg-white/5', a.dataset.tocLink === moduleId));
    // Keep the active entry visible inside the scrollable desktop sidebar
    const desktopToc = $('aside [data-toc]');
    const active = desktopToc && desktopToc.querySelector(`[data-toc-sub="${sectionId}"]`);
    if (active && desktopToc.offsetParent) {
      const r = active.getBoundingClientRect(), c = desktopToc.getBoundingClientRect();
      if (r.top < c.top || r.bottom > c.bottom) desktopToc.scrollBy({ top: r.top - c.top - c.height / 3, behavior: 'smooth' });
    }
  }

  function observe() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        setActive(id);
        Store.setLast(id);
        if (!id.endsWith('-quiz') && Store.markVisited(id)) refresh();
      });
    }, { rootMargin: '-20% 0px -65% 0px' });
    $$('[data-subsection]').forEach((s) => io.observe(s));
  }

  function initReset() {
    $$('[data-reset-progress]').forEach((btn) => btn.addEventListener('click', () => {
      Store.resetAll();
      $$('[data-visited-dot]').forEach((d) => d.classList.replace('bg-nf-red', 'bg-neutral-600'));
      $$('[data-quiz]').forEach(renderQuiz);
      refresh();
    }));
  }

  return { refresh, observe, initReset };
})();

function initChrome() {
  const nav = $('#topnav');
  const bar = $('#read-progress');
  const onScroll = () => {
    const solid = window.scrollY > 40;
    nav.classList.toggle('bg-nf-bg', solid);
    nav.classList.toggle('shadow-lg', solid);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // "Start Learning" becomes "Resume" once the learner has progress
  const last = Store.get().last;
  if (last && document.getElementById(last)) {
    $('#cta-play').setAttribute('href', `#${last}`);
    $('#cta-label').textContent = 'Resume';
  }
}

/* ---------------------------------------------------------------------------
 * 7. Widgets
 * ------------------------------------------------------------------------ */
function initTabs() {
  $$('[data-tabs]').forEach((group) => {
    const buttons = $$('[data-tab]', group);
    buttons.forEach((btn) => btn.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      $$('[data-panel]', group).forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== btn.dataset.tab));
    }));
  });
}

function initCodeBlocks() {
  $$('.prose pre').forEach((pre) => {
    const code = pre.querySelector('code');
    if (!code) return;
    if (window.hljs) window.hljs.highlightElement(code);
    const lang = (code.className.match(/language-(\w+)/) || [])[1];
    if (lang) {
      const tag = el('span', 'pointer-events-none absolute left-3 top-0 -translate-y-1/2 rounded-sm bg-nf-red px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-wider text-white', lang);
      pre.appendChild(tag);
    }
    const btn = el('button', 'absolute right-2 top-2 rounded-sm border border-neutral-700 bg-nf-elevated px-2 py-1 font-sans text-[0.7rem] font-semibold text-neutral-300 opacity-80 transition hover:text-white hover:opacity-100', 'Copy');
    btn.type = 'button';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        btn.textContent = 'Copied!';
      } catch (_) {
        btn.textContent = 'Press ⌘/Ctrl+C';
      }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
    });
    pre.appendChild(btn);
  });
}

const LATENCY_DATA = [
  { label: 'L1 cache reference', ns: 0.5 },
  { label: 'Branch mispredict', ns: 5 },
  { label: 'L2 cache reference', ns: 7 },
  { label: 'Mutex lock/unlock', ns: 25 },
  { label: 'Main memory reference', ns: 100 },
  { label: 'Compress 1 KB (fast codec)', ns: 2_000 },
  { label: 'Send 1 KB over 1 Gbps network', ns: 10_000 },
  { label: 'Random 4 KB read, NVMe SSD', ns: 20_000 },
  { label: 'Read 1 MB sequentially from memory', ns: 250_000 },
  { label: 'Round trip within same data center', ns: 500_000 },
  { label: 'Read 1 MB sequentially from SSD', ns: 1_000_000 },
  { label: 'Spinning-disk seek', ns: 10_000_000 },
  { label: 'Read 1 MB sequentially from disk', ns: 20_000_000 },
  { label: 'Packet CA → Netherlands → CA', ns: 150_000_000 }
];

function formatNs(ns) {
  if (ns < 1_000) return `${ns} ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toLocaleString()} µs`;
  return `${(ns / 1_000_000).toLocaleString()} ms`;
}
function humanScale(ns) {
  const s = ns / 0.5; // L1 hit = 1 second
  if (s < 60) return `${+s.toFixed(0)} s`;
  if (s < 3_600) return `${+(s / 60).toFixed(1)} min`;
  if (s < 86_400) return `${+(s / 3_600).toFixed(1)} hours`;
  if (s < 86_400 * 60) return `${+(s / 86_400).toFixed(1)} days`;
  if (s < 86_400 * 365) return `${+(s / (86_400 * 30)).toFixed(1)} months`;
  return `${+(s / (86_400 * 365)).toFixed(1)} years`;
}

function renderLatencyChart() {
  const host = $('[data-latency-chart]');
  if (!host) return;
  const lo = Math.log10(0.1), hi = Math.log10(LATENCY_DATA.at(-1).ns);
  host.innerHTML = `
    <div class="mb-3 grid grid-cols-[minmax(0,13rem)_1fr_5.5rem_6rem] gap-3 text-[0.65rem] font-semibold uppercase tracking-wider text-nf-muted">
      <span>Operation</span><span>Log scale</span><span class="text-right">Actual</span><span class="text-right">If L1 = 1 s</span>
    </div>
    ${LATENCY_DATA.map((d) => {
      const w = ((Math.log10(d.ns) - lo) / (hi - lo)) * 100;
      const hot = d.ns >= 500_000;
      return `
      <div class="grid grid-cols-[minmax(0,13rem)_1fr_5.5rem_6rem] items-center gap-3 py-1 text-sm">
        <span class="truncate text-neutral-300" title="${d.label}">${d.label}</span>
        <span class="h-3 overflow-hidden rounded-sm bg-white/5"><span class="block h-full rounded-sm ${hot ? 'bg-nf-red' : 'bg-neutral-400'}" style="width:${w.toFixed(1)}%"></span></span>
        <span class="text-right font-mono text-xs text-white">${formatNs(d.ns)}</span>
        <span class="text-right text-xs text-nf-muted">${humanScale(d.ns)}</span>
      </div>`;
    }).join('')}`;
}

function initLittlesLaw() {
  const root = $('[data-littles-law]');
  if (!root) return;
  const get = (k) => Math.max(0, Number(root.querySelector(`[data-ll="${k}"]`).value) || 0);
  const update = () => {
    const inflight = get('rate') * (get('ms') / 1000);
    const per = Math.max(1, get('per'));
    root.querySelector('[data-ll-out="inflight"]').textContent = inflight.toLocaleString(undefined, { maximumFractionDigits: 1 });
    root.querySelector('[data-ll-out="instances"]').textContent = Math.max(1, Math.ceil(inflight / (per * 0.7))).toLocaleString();
  };
  root.addEventListener('input', update);
  update();
}

function initAvailability() {
  const root = $('[data-availability]');
  if (!root) return;
  const field = (k) => root.querySelector(`[data-av="${k}"]`);
  const update = () => {
    const a = Math.min(100, Math.max(0, Number(field('each').value) || 0)) / 100;
    const n = Math.min(50, Math.max(1, Math.round(Number(field('n').value) || 1)));
    const sys = field('mode').value === 'series' ? Math.pow(a, n) : 1 - Math.pow(1 - a, n);
    const hours = (1 - sys) * 8766;
    const down = hours >= 24 ? `${(hours / 24).toFixed(1)} days`
      : hours >= 1 ? `${hours.toFixed(1)} h`
      : hours * 60 >= 1 ? `${(hours * 60).toFixed(1)} min`
      : `${(hours * 3600).toFixed(1)} s`;
    root.querySelector('[data-av-out="pct"]').textContent = `${(sys * 100).toFixed(sys > 0.9999 ? 5 : 2)}%`;
    root.querySelector('[data-av-out="down"]').textContent = down;
  };
  root.addEventListener('input', update);
  root.addEventListener('change', update);
  update();
}

const SCALING_STAGES = [
  {
    title: 'One server does everything', users: '0 – 1K users',
    tiers: [['Users'], ['Web app + Database (one VM)']],
    hot: 1,
    body: 'The app and the database share one machine. Simple, cheap, perfect for finding product-market fit. But CPU, memory and disk are contended by two very different workloads, and the machine is a single point of failure.',
    bottleneck: 'App and DB compete for the same resources; one box = one SPOF.'
  },
  {
    title: 'Separate the database', users: '1K – 10K users',
    tiers: [['Users'], ['Web app server'], ['Database server']],
    hot: 2,
    body: 'Move the database to its own (bigger) machine. Each tier can now be scaled vertically on its own, and the database gets dedicated memory for its buffer cache.',
    bottleneck: 'The single web server saturates and still cannot survive a crash.'
  },
  {
    title: 'Load balancer + stateless replicas', users: '10K – 100K users',
    tiers: [['Users'], ['Load balancer'], ['App', 'App', 'App'], ['Redis (sessions)', 'Database']],
    hot: 2,
    body: 'Make the app stateless (sessions to Redis), put several replicas behind a load balancer, and spread them across availability zones. The web tier now scales horizontally and survives instance failures.',
    bottleneck: 'Every request still hits the database; reads dominate its load.'
  },
  {
    title: 'Cache and CDN', users: '100K – 1M users',
    tiers: [['Users'], ['CDN (static + media)'], ['Load balancer'], ['App', 'App', 'App', 'App'], ['Cache', 'Database']],
    hot: 1,
    body: 'Serve static assets and media from a CDN and put a cache in front of hot database reads. Often 80–99% of traffic is absorbed before it touches the origin or database.',
    bottleneck: 'Database writes and cache misses still converge on one primary.'
  },
  {
    title: 'Replicate the database', users: '1M – 10M users',
    tiers: [['Users'], ['CDN'], ['Load balancer'], ['App', 'App', 'App', 'App', 'App'], ['Cache', 'Primary (writes)', 'Replica', 'Replica']],
    hot: 4,
    body: 'Add read replicas and route reads to them, writes to the primary. A standby replica can be promoted on failure. Now you must handle replication lag: a user may not immediately see their own write.',
    bottleneck: 'Write volume and slow synchronous work (emails, image processing) on the request path.'
  },
  {
    title: 'Async work, sharding & multiple regions', users: '10M+ users',
    tiers: [['Users (worldwide)'], ['GeoDNS', 'CDN'], ['Region A', 'Region B'], ['App fleet', 'Queue', 'Workers'], ['Cache cluster', 'Shard 1', 'Shard 2', 'Shard N']],
    hot: 4,
    body: 'Slow work moves to queues processed by workers. Data is partitioned (sharded) so writes spread across many primaries. Multiple regions put the system near users and survive the loss of an entire region.',
    bottleneck: 'Operational complexity: consistency, observability and cost become the hard problems.'
  }
];

function initStepper() {
  const root = $('[data-stepper]');
  if (!root) return;
  let i = 0;
  root.className = 'not-prose my-6 overflow-hidden rounded-md border border-nf-line bg-nf-card';
  root.innerHTML = `
    <div class="no-scrollbar flex overflow-x-auto border-b border-nf-line bg-nf-elevated" role="tablist" data-step-tabs>
      ${SCALING_STAGES.map((s, k) => `<button type="button" class="tab-btn" role="tab" data-step="${k}">Stage ${k + 1}</button>`).join('')}
    </div>
    <div class="grid gap-6 p-5 md:grid-cols-[1.1fr_1fr] md:p-6">
      <div class="flex flex-col items-center justify-center gap-2 rounded-md bg-black/40 p-4" data-step-diagram></div>
      <div>
        <p class="font-display text-lg tracking-[0.25em] text-nf-red" data-step-users></p>
        <p class="mt-1 font-display text-3xl leading-none tracking-wide text-white" data-step-title></p>
        <p class="mt-3 text-sm leading-relaxed text-neutral-300" data-step-body></p>
        <p class="mt-4 rounded-sm border-l-4 border-amber-500 bg-white/5 p-3 text-sm text-neutral-300"><span class="block text-[0.65rem] font-bold uppercase tracking-[0.2em] text-amber-400">Next bottleneck</span><span data-step-bottleneck></span></p>
        <div class="mt-5 flex flex-wrap gap-2">
          <button type="button" class="whitespace-nowrap rounded bg-neutral-500/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-500/40 disabled:opacity-40" data-step-prev>← Previous</button>
          <button type="button" class="whitespace-nowrap rounded bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-white/75 disabled:opacity-40" data-step-next>Next stage →</button>
        </div>
      </div>
    </div>`;

  const show = (k) => {
    i = Math.max(0, Math.min(SCALING_STAGES.length - 1, k));
    const s = SCALING_STAGES[i];
    $$('[data-step]', root).forEach((b) => b.setAttribute('aria-selected', String(Number(b.dataset.step) === i)));
    $('[data-step-users]', root).textContent = s.users;
    $('[data-step-title]', root).textContent = s.title;
    $('[data-step-body]', root).textContent = s.body;
    $('[data-step-bottleneck]', root).textContent = s.bottleneck;
    $('[data-step-prev]', root).disabled = i === 0;
    $('[data-step-next]', root).disabled = i === SCALING_STAGES.length - 1;
    $('[data-step-diagram]', root).innerHTML = s.tiers.map((tier, t) => `
      ${t ? '<svg class="h-4 w-4 text-nf-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 4v16M6 14l6 6 6-6"/></svg>' : ''}
      <div class="flex w-full flex-wrap justify-center gap-2">
        ${tier.map((box) => `<span class="rounded-sm border px-2.5 py-1.5 text-center text-xs font-semibold ${t === s.hot ? 'border-nf-red bg-nf-red/15 text-white' : 'border-neutral-600 bg-nf-elevated text-neutral-300'}">${box}</span>`).join('')}
      </div>`).join('');
  };
  $$('[data-step]', root).forEach((b) => b.addEventListener('click', () => show(Number(b.dataset.step))));
  $('[data-step-prev]', root).addEventListener('click', () => show(i - 1));
  $('[data-step-next]', root).addEventListener('click', () => show(i + 1));
  show(0);
}

/**
 * Load-balancer simulator. N single-worker FIFO servers, Poisson arrivals,
 * exponential service times (mean = 10 ms on a normal-speed server). Every
 * algorithm sees the identical arrival/service stream so results are comparable.
 */
const LB_ALGORITHMS = [
  { id: 'rr', label: 'Round robin' },
  { id: 'random', label: 'Random' },
  { id: 'p2c', label: 'Power of two choices' },
  { id: 'lc', label: 'Least connections' }
];

function simulateLb({ alg, util, slow, servers = 8, requests = 20000 }) {
  const MEAN_MS = 10;
  const speed = Array(servers).fill(1);
  if (slow) speed[0] = 3; // one server takes 3× longer per request
  const capacity = speed.reduce((sum, s) => sum + 1 / s, 0);
  const lambda = util * capacity; // requests per mean-service-time

  const workload = mulberry32(42);
  const pick = mulberry32(hashString(alg));
  const queues = Array.from({ length: servers }, () => []); // finish times, ascending
  const freeAt = Array(servers).fill(0);
  const latencies = new Float64Array(requests);
  let t = 0, rr = 0, maxQueue = 0;

  for (let i = 0; i < requests; i++) {
    t += -Math.log(1 - workload()) / lambda;
    const work = -Math.log(1 - workload());
    for (const q of queues) while (q.length && q[0] <= t) q.shift();

    let s;
    if (alg === 'rr') s = rr++ % servers;
    else if (alg === 'random') s = Math.floor(pick() * servers);
    else if (alg === 'p2c') {
      const a = Math.floor(pick() * servers);
      let b = Math.floor(pick() * (servers - 1));
      if (b >= a) b++;
      s = queues[a].length <= queues[b].length ? a : b;
    } else {
      const offset = Math.floor(pick() * servers); // random tie-break
      s = offset;
      for (let k = 1; k < servers; k++) {
        const c = (offset + k) % servers;
        if (queues[c].length < queues[s].length) s = c;
      }
    }

    const start = Math.max(t, freeAt[s]);
    const end = start + work * speed[s];
    freeAt[s] = end;
    queues[s].push(end);
    latencies[i] = (end - t) * MEAN_MS;
    if (queues[s].length > maxQueue) maxQueue = queues[s].length;
  }
  latencies.sort();
  const pct = (p) => latencies[Math.min(requests - 1, Math.floor(p * requests))];
  return { p50: pct(0.5), p99: pct(0.99), maxQueue };
}

function initLbSim() {
  const root = $('[data-lb-sim]');
  if (!root) return;
  root.className = 'not-prose my-6 rounded-md border border-nf-line bg-nf-card p-5';
  root.innerHTML = `
    <div class="flex flex-wrap items-end gap-x-8 gap-y-4">
      <label class="block min-w-[14rem] flex-1 text-sm text-neutral-300">Fleet utilization: <b class="text-white" data-sim-util-label>80%</b>
        <input type="range" min="50" max="95" step="5" value="80" data-sim="util" class="mt-2 w-full accent-[#E50914]" />
      </label>
      <label class="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" data-sim="slow" class="h-4 w-4 accent-[#E50914]" />
        One server is 3× slower
      </label>
    </div>
    <div class="mt-5 overflow-x-auto">
      <table class="w-full min-w-[520px] text-left text-sm">
        <thead class="text-xs uppercase tracking-wider text-nf-muted">
          <tr><th class="py-2 pr-4">Algorithm</th><th class="py-2 pr-4 text-right">p50</th><th class="py-2 pr-4 text-right">p99</th><th class="py-2 pr-4 text-right">Max queue</th><th class="w-2/5 py-2">p99 (log scale)</th></tr>
        </thead>
        <tbody class="divide-y divide-nf-line" data-sim-rows></tbody>
      </table>
    </div>
    <p class="mt-3 text-xs text-nf-muted">8 servers · 20,000 requests · mean service time 10 ms · same arrivals for every algorithm. With a slow server, total capacity drops and the slow server should get less traffic — watch which algorithms notice.</p>`;

  const run = () => {
    const util = Number($('[data-sim="util"]', root).value) / 100;
    const slow = $('[data-sim="slow"]', root).checked;
    $('[data-sim-util-label]', root).textContent = `${Math.round(util * 100)}%`;
    const results = LB_ALGORITHMS.map((a) => ({ ...a, ...simulateLb({ alg: a.id, util, slow }) }));
    const maxLog = Math.log10(Math.max(...results.map((r) => r.p99)) + 1);
    const fmt = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms.toFixed(0)} ms`);
    const best = Math.min(...results.map((r) => r.p99));
    $('[data-sim-rows]', root).innerHTML = results.map((r) => `
      <tr>
        <td class="py-2 pr-4 font-semibold text-white">${r.label}</td>
        <td class="py-2 pr-4 text-right font-mono text-neutral-300">${fmt(r.p50)}</td>
        <td class="py-2 pr-4 text-right font-mono ${r.p99 === best ? 'text-nf-green' : 'text-white'}">${fmt(r.p99)}</td>
        <td class="py-2 pr-4 text-right font-mono text-neutral-300">${r.maxQueue}</td>
        <td class="py-2"><span class="block h-2.5 rounded-sm ${r.p99 === best ? 'bg-nf-green' : 'bg-nf-red'}" style="width:${Math.max(2, (Math.log10(r.p99 + 1) / maxLog) * 100).toFixed(1)}%"></span></td>
      </tr>`).join('');
  };
  root.addEventListener('input', run);
  run();
}

function initHitRatio() {
  const root = $('[data-hit-ratio]');
  if (!root) return;
  const num = (k) => Math.max(0, Number(root.querySelector(`[data-hr="${k}"]`).value) || 0);
  const update = () => {
    const h = Math.min(100, num('h')) / 100;
    const hit = num('hit'), miss = num('miss'), rps = num('rps');
    const avg = h * hit + (1 - h) * (hit + miss);
    root.querySelector('[data-hr-out="avg"]').textContent = `${avg.toFixed(avg < 10 ? 2 : 1)} ms`;
    root.querySelector('[data-hr-out="db"]').textContent = `${Math.round(rps * (1 - h)).toLocaleString()} /s`;
    root.querySelector('[data-hr-out="x"]').textContent = h >= 1 ? '∞' : `${(1 / (1 - h)).toLocaleString(undefined, { maximumFractionDigits: 1 })}×`;
  };
  root.addEventListener('input', update);
  update();
}

/**
 * Shard-key simulator: 20,000 writes routed to 8 shards by different keys.
 */
const SHARD_STRATEGIES = [
  { id: 'user', label: 'hash(user_id)', note: 'Many users, each a small share of writes: hashing spreads load almost perfectly.' },
  { id: 'time', label: 'range(created_at)', note: 'Every new row has a recent timestamp, so the newest range takes nearly all writes. Old shards sit idle.' },
  { id: 'country', label: 'country', note: 'Real populations are uneven. The shard holding the largest countries does several times its share.' },
  { id: 'tenant', label: 'hash(tenant_id) + 1 whale', note: 'Hashing is even across tenants, but one huge tenant creates 30% of writes and drags its shard with it.' }
];
const COUNTRY_WEIGHTS = [0.30, 0.18, 0.10, 0.08, 0.07, 0.06, 0.05, 0.04, 0.04, 0.03, 0.03, 0.02];

function simulateShards(strategy, shards = 8, writes = 20000) {
  const rand = mulberry32(7);
  const counts = Array(shards).fill(0);
  for (let i = 0; i < writes; i++) {
    let s;
    if (strategy === 'user') {
      s = hashString(`user:${Math.floor(rand() * 100000)}`) % shards;
    } else if (strategy === 'time') {
      s = rand() < 0.97 ? shards - 1 : shards - 2; // a few late updates to last quarter's rows
    } else if (strategy === 'country') {
      let r = rand(), c = 0;
      while (c < COUNTRY_WEIGHTS.length - 1 && r >= COUNTRY_WEIGHTS[c]) { r -= COUNTRY_WEIGHTS[c]; c++; }
      s = c % shards;
    } else {
      const tenant = rand() < 0.3 ? 'whale' : `tenant:${Math.floor(rand() * 5000)}`;
      s = hashString(tenant) % shards;
    }
    counts[s]++;
  }
  return counts.map((c) => c / writes);
}

function initShardSim() {
  const root = $('[data-shard-sim]');
  if (!root) return;
  root.className = 'not-prose my-6 overflow-hidden rounded-md border border-nf-line bg-nf-card';
  root.innerHTML = `
    <div class="no-scrollbar flex overflow-x-auto border-b border-nf-line bg-nf-elevated" role="tablist">
      ${SHARD_STRATEGIES.map((st) => `<button type="button" class="tab-btn font-mono" role="tab" data-shard-key="${st.id}">${st.label}</button>`).join('')}
    </div>
    <div class="p-4 sm:p-5">
      <div class="overflow-x-auto"><div class="min-w-[272px]">
        <div class="flex h-48 items-end gap-1 border-b border-nf-line pb-px sm:gap-2" data-shard-bars></div>
        <div class="mt-2 flex gap-1 text-center text-[0.7rem] text-nf-muted sm:gap-2">${Array.from({ length: 8 }, (_, i) => `<span class="flex-1">S${i + 1}</span>`).join('')}</div>
      </div></div>
      <p class="mt-4 text-sm text-neutral-300"><b class="text-white" data-shard-summary></b> <span data-shard-note></span></p>
    </div>`;
  const show = (id) => {
    const shares = simulateShards(id);
    const max = Math.max(...shares);
    $$('[data-shard-key]', root).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.shardKey === id)));
    $('[data-shard-bars]', root).innerHTML = shares.map((sh) => `
      <div class="flex h-full flex-1 flex-col justify-end">
        <span class="mb-1 text-center text-[0.6rem] font-semibold sm:text-[0.7rem] ${sh === max && max > 0.2 ? 'text-nf-red' : 'text-neutral-400'}">${(sh * 100).toFixed(1)}%</span>
        <span class="block rounded-t-sm ${sh === max && max > 0.2 ? 'bg-nf-red' : 'bg-neutral-500'}" style="height:${Math.max(1, (sh / Math.max(max, 0.125)) * 85)}%"></span>
      </div>`).join('');
    $('[data-shard-summary]', root).textContent = `Hottest shard: ${(max * 100).toFixed(1)}% of writes (${(max / 0.125).toFixed(1)}× its fair share).`;
    $('[data-shard-note]', root).textContent = SHARD_STRATEGIES.find((s) => s.id === id).note;
  };
  $$('[data-shard-key]', root).forEach((b) => b.addEventListener('click', () => show(b.dataset.shardKey)));
  show('user');
}

/**
 * Queue load-leveling simulator: a steady arrival rate with a spike, drained
 * by a fixed pool of consumers. One-second time steps over 10 minutes.
 */
function simulateQueue({ base, mult, spikeSec, consumers, perConsumer, horizon = 600, spikeAt = 60 }) {
  const capacity = consumers * perConsumer;
  const series = [];
  let backlog = 0, peak = 0, maxWait = 0, drainedAt = null;
  for (let t = 0; t <= horizon; t++) {
    series.push(backlog);
    const inSpike = t >= spikeAt && t < spikeAt + spikeSec;
    const arrivals = base * (inSpike ? mult : 1);
    backlog = Math.max(0, backlog + arrivals - capacity);
    peak = Math.max(peak, backlog);
    if (capacity > 0) maxWait = Math.max(maxWait, backlog / capacity);
    if (drainedAt === null && t >= spikeAt + spikeSec && backlog === 0) drainedAt = t;
  }
  return { series, peak, maxWait: capacity > 0 ? maxWait : Infinity, capacity, drainedAt, spikeAt, spikeEnd: spikeAt + spikeSec, horizon };
}

function initQueueSim() {
  const root = $('[data-queue-sim]');
  if (!root) return;
  root.className = 'not-prose my-6 rounded-md border border-nf-line bg-nf-card p-5';
  const field = (key, label, value, attrs) => `
    <label class="block text-sm text-neutral-300">${label}
      <input type="number" data-q="${key}" value="${value}" ${attrs} class="field mt-1" />
    </label>`;
  root.innerHTML = `
    <div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
      ${field('base', 'Normal arrivals (msg/s)', 100, 'min="0" step="10"')}
      ${field('mult', 'Spike multiplier (×)', 5, 'min="1" step="1"')}
      ${field('spikeSec', 'Spike length (s)', 30, 'min="0" max="300" step="5"')}
      ${field('consumers', 'Consumers', 4, 'min="0" max="200" step="1"')}
      ${field('perConsumer', 'Each consumer (msg/s)', 40, 'min="0" step="5"')}
    </div>
    <div class="mt-5 overflow-x-auto">
      <svg viewBox="0 0 680 230" class="h-auto w-full min-w-[520px]" role="img" aria-label="Queue backlog over time" data-q-chart></svg>
    </div>
    <dl class="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div class="stat-tile"><dt>Drain capacity</dt><dd data-q-out="cap"></dd></div>
      <div class="stat-tile"><dt>Peak backlog</dt><dd data-q-out="peak"></dd></div>
      <div class="stat-tile"><dt>Longest wait</dt><dd data-q-out="wait"></dd></div>
      <div class="stat-tile"><dt>Drain time after spike</dt><dd data-q-out="drain"></dd></div>
    </dl>`;

  const num = (k) => Math.max(0, Number($(`[data-q="${k}"]`, root).value) || 0);
  const fmtTime = (s) => (s === Infinity ? '∞' : s >= 60 ? `${(s / 60).toFixed(1)} min` : `${Math.round(s)} s`);

  const update = () => {
    const r = simulateQueue({ base: num('base'), mult: Math.max(1, num('mult')), spikeSec: Math.min(300, num('spikeSec')), consumers: num('consumers'), perConsumer: num('perConsumer') });
    const X0 = 60, X1 = 660, Y0 = 195, Y1 = 15;
    const yTop = Math.max(10, r.peak);
    const yMax = yTop * 1.1;
    const x = (t) => X0 + (t / r.horizon) * (X1 - X0);
    const y = (v) => Y0 - (v / yMax) * (Y0 - Y1);
    const pts = r.series.map((v, t) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const ticks = [0, 0.5, 1].map((f) => `
      <line x1="${X0}" y1="${y(yTop * f)}" x2="${X1}" y2="${y(yTop * f)}" stroke="#2a2a2a"/>
      <text x="${X0 - 6}" y="${y(yTop * f) + 4}" fill="#a3a3a3" font-size="11" text-anchor="end" font-family="Inter,sans-serif">${Math.round(yTop * f).toLocaleString()}</text>`).join('');
    const xt = [0, 120, 240, 360, 480, 600].map((t) => `<text x="${x(t)}" y="${Y0 + 18}" fill="#a3a3a3" font-size="11" text-anchor="middle" font-family="Inter,sans-serif">${t / 60} min</text>`).join('');
    $('[data-q-chart]', root).innerHTML = `
      <rect x="${x(r.spikeAt)}" y="${Y1}" width="${Math.max(1, x(r.spikeEnd) - x(r.spikeAt))}" height="${Y0 - Y1}" fill="#E50914" opacity=".12"/>
      <text x="${x(r.spikeAt) + 4}" y="${Y1 + 14}" fill="#ff8a8f" font-size="11" font-family="Inter,sans-serif">spike</text>
      ${ticks}${xt}
      <line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" stroke="#555"/>
      <line x1="${X0}" y1="${Y1}" x2="${X0}" y2="${Y0}" stroke="#555"/>
      <polyline points="${pts}" fill="none" stroke="#E50914" stroke-width="2.5" stroke-linejoin="round"/>
      <text x="${X1}" y="${Y1 - 2}" fill="#a3a3a3" font-size="11" text-anchor="end" font-family="Inter,sans-serif">backlog (messages)</text>`;

    const neverDrains = num('base') >= r.capacity && r.series[r.series.length - 1] > 0;
    $('[data-q-out="cap"]', root).textContent = `${r.capacity.toLocaleString()}/s`;
    $('[data-q-out="peak"]', root).textContent = Math.round(r.peak).toLocaleString();
    $('[data-q-out="wait"]', root).textContent = fmtTime(r.maxWait);
    $('[data-q-out="drain"]', root).textContent = neverDrains ? 'never' : r.drainedAt === null ? '> 10 min' : fmtTime(Math.max(0, r.drainedAt - r.spikeEnd));
  };
  root.addEventListener('input', update);
  update();
}

/* Shared helper for the small "inputs → stat tiles" calculators below. */
function buildCalc(root, { title, fields, outputs, cols = 'sm:grid-cols-3' }) {
  root.className = 'not-prose my-6 rounded-md border border-nf-line bg-nf-card p-5';
  root.innerHTML = `
    ${title ? `<p class="font-display text-2xl tracking-wide text-white">${title}</p>` : ''}
    <div class="mt-4 grid gap-4 ${cols}">
      ${fields.map((f) => f.options
        ? `<label class="block text-sm text-neutral-300">${f.label}
             <select data-f="${f.key}" class="field mt-1">${f.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
           </label>`
        : `<label class="block text-sm text-neutral-300">${f.label}
             <input type="number" data-f="${f.key}" value="${f.value}" ${f.attrs || ''} class="field mt-1" />
           </label>`).join('')}
    </div>
    <dl class="mt-5 grid gap-3 sm:grid-cols-2 ${outputs.length > 2 ? 'xl:grid-cols-' + Math.min(outputs.length, 4) : ''}">
      ${outputs.map((o) => `<div class="stat-tile"><dt>${o.label}</dt><dd data-o="${o.key}"></dd></div>`).join('')}
    </dl>
    <p class="mt-3 text-xs text-nf-muted" data-calc-note></p>`;
  const get = (k) => {
    const node = root.querySelector(`[data-f="${k}"]`);
    return node.tagName === 'SELECT' ? node.value : Math.max(0, Number(node.value) || 0);
  };
  const set = (k, v) => { root.querySelector(`[data-o="${k}"]`).textContent = v; };
  const note = (t) => { root.querySelector('[data-calc-note]').textContent = t; };
  return { get, set, note, onChange: (fn) => { root.addEventListener('input', fn); root.addEventListener('change', fn); fn(); } };
}

const fmtNum = (n, d = 0) => n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
function fmtDuration(min) {
  if (!isFinite(min)) return '∞';
  if (min < 1) return `${fmtNum(min * 60)} s`;
  if (min < 120) return `${fmtNum(min, 1)} min`;
  if (min < 60 * 48) return `${fmtNum(min / 60, 1)} h`;
  return `${fmtNum(min / 1440, 1)} days`;
}

function initChainCalc() {
  const root = $('[data-chain-calc]');
  if (!root) return;
  const c = buildCalc(root, {
    title: 'Call-chain calculator',
    cols: 'sm:grid-cols-2 lg:grid-cols-4',
    fields: [
      { key: 'n', label: 'Services called', value: 5, attrs: 'min="1" max="50" step="1"' },
      { key: 'mode', label: 'Arrangement', options: [['series', 'In sequence (A → B → C…)'], ['fanout', 'In parallel (fan-out, wait for all)']] },
      { key: 'a', label: 'Each service availability (%)', value: 99.9, attrs: 'min="0" max="100" step="0.01"' },
      { key: 'p50', label: 'Each service median latency (ms)', value: 20, attrs: 'min="0" step="1"' },
    ],
    outputs: [
      { key: 'avail', label: 'End-to-end availability' },
      { key: 'down', label: 'Downtime / 30 days' },
      { key: 'lat', label: 'Typical latency' },
      { key: 'tail', label: 'Requests hitting ≥1 p99' },
    ],
  });
  c.onChange(() => {
    const n = Math.max(1, Math.round(c.get('n')));
    const a = Math.min(100, c.get('a')) / 100;
    const sys = Math.pow(a, n);   // both arrangements need every call to succeed
    c.set('avail', `${(sys * 100).toFixed(sys > 0.9999 ? 4 : 2)}%`);
    c.set('down', fmtDuration((1 - sys) * 30 * 24 * 60));
    c.set('lat', c.get('mode') === 'series' ? `≈ ${fmtNum(n * c.get('p50'))} ms` : `> ${fmtNum(c.get('p50'))} ms`);
    c.set('tail', `${((1 - Math.pow(0.99, n)) * 100).toFixed(1)}%`);
    c.note(c.get('mode') === 'series'
      ? 'Sequential calls add their latencies, and every one must succeed.'
      : 'Fan-out runs in parallel, so latency is set by the slowest of the calls — and every one must still succeed.');
  });
}

/**
 * Critical-rendering-path model (illustrative): mobile network with 150 ms RTT,
 * 450 ms to open a new HTTPS connection. Times in ms.
 */
const CRP_OPTS = [
  { id: 'defer', label: 'Defer the 300 KB script' },
  { id: 'inline', label: 'Inline critical CSS' },
  { id: 'preload', label: 'Preload hero image (fetchpriority=high)' },
  { id: 'preconnect', label: 'Preconnect to image CDN' },
  { id: 'optimize', label: 'Serve right-sized AVIF' },
];

function modelCrp(o) {
  const htmlDone = 700;                          // 450 connect + 150 TTFB + 100 transfer
  const cssDone = o.inline ? htmlDone : 950;
  const jsDownloaded = 1300;
  const jsExecEnd = 1700;
  const parserFree = o.defer ? htmlDone : jsExecEnd;
  const fcp = Math.max(cssDone, o.defer ? 0 : jsExecEnd) + 50;
  const imgDiscover = o.preload ? htmlDone : parserFree + 50;
  const connStart = o.preconnect ? htmlDone : imgDiscover;
  const connReady = connStart + 450;
  const imgStart = Math.max(imgDiscover, connReady);
  const transfer = (o.optimize ? 200 : 700) * (o.preload ? 0.8 : 1);
  const imgDone = imgStart + 150 + transfer;
  const lcp = Math.max(fcp, imgDone + 50);
  return { htmlDone, cssDone, jsDownloaded, jsExecEnd, fcp, imgDiscover, connStart, connReady, imgStart, imgDone, lcp };
}

function initCrpSim() {
  const root = $('[data-crp-sim]');
  if (!root) return;
  root.className = 'not-prose my-6 rounded-md border border-nf-line bg-nf-card p-5';
  root.innerHTML = `
    <div class="flex flex-wrap gap-x-6 gap-y-2">
      ${CRP_OPTS.map((op) => `<label class="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" data-crp="${op.id}" class="h-4 w-4 accent-[#E50914]" />${op.label}</label>`).join('')}
    </div>
    <div class="mt-5 overflow-x-auto"><svg viewBox="0 0 700 250" class="h-auto w-full min-w-[560px]" role="img" aria-label="Page load waterfall" data-crp-chart></svg></div>
    <dl class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="stat-tile"><dt>First contentful paint</dt><dd data-crp-out="fcp"></dd></div>
      <div class="stat-tile"><dt>Largest contentful paint</dt><dd data-crp-out="lcp"></dd></div>
      <div class="stat-tile"><dt>LCP rating</dt><dd data-crp-out="rating"></dd></div>
    </dl>
    <p class="mt-3 text-xs text-nf-muted">Simplified, illustrative model of a mobile load (150 ms round trips). Real pages have many more resources, but the same dependencies.</p>`;

  const update = () => {
    const o = Object.fromEntries(CRP_OPTS.map((op) => [op.id, $(`[data-crp="${op.id}"]`, root).checked]));
    const m = modelCrp(o);
    const X0 = 130, X1 = 680, T = 3500;
    const x = (t) => X0 + (Math.min(t, T) / T) * (X1 - X0);
    const row = (i, label, segs) => `
      <text x="8" y="${34 + i * 32}" fill="#d4d4d4" font-size="12" font-family="Inter,sans-serif">${label}</text>
      ${segs.map(([a, b, color, dash]) => `<rect x="${x(a)}" y="${22 + i * 32}" width="${Math.max(2, x(b) - x(a))}" height="16" rx="2" fill="${color}" ${dash ? 'opacity=".45"' : ''}/>`).join('')}`;
    const rows = [
      row(0, 'HTML', [[0, 450, '#5c5c5c', true], [450, m.htmlDone, '#a3a3a3']]),
      o.inline ? row(1, 'CSS (inlined)', []) : row(1, 'CSS (blocking)', [[m.htmlDone, m.cssDone, '#F59E0B']]),
      row(2, o.defer ? 'JS (deferred)' : 'JS (blocking)', [[m.htmlDone, m.jsDownloaded, '#808080'], [m.jsDownloaded, m.jsExecEnd, o.defer ? '#4a4a4a' : '#E50914']]),
      row(3, 'CDN connection', [[m.connStart, m.connReady, '#5c5c5c', true]]),
      row(4, 'Hero image', [[m.imgStart, m.imgDone, '#46D369']]),
    ].join('');
    const marker = (t, label, color, yText) => `
      <line x1="${x(t)}" y1="12" x2="${x(t)}" y2="196" stroke="${color}" stroke-width="2" stroke-dasharray="4 3"/>
      <text x="${x(t) + 4}" y="${yText}" fill="${color}" font-size="11" font-family="Inter,sans-serif">${label}</text>`;
    const ticks = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500].map((t) => `
      <line x1="${x(t)}" y1="196" x2="${x(t)}" y2="202" stroke="#555"/>
      <text x="${x(t)}" y="216" fill="#a3a3a3" font-size="11" text-anchor="middle" font-family="Inter,sans-serif">${t / 1000}s</text>`).join('');
    $('[data-crp-chart]', root).innerHTML = `
      <rect x="${x(2500)}" y="12" width="${x(T) - x(2500)}" height="184" fill="#E50914" opacity=".06"/>
      <line x1="${X0}" y1="196" x2="${X1}" y2="196" stroke="#555"/>${ticks}${rows}
      ${marker(m.fcp, 'FCP', '#ffffff', 236)}${marker(m.lcp, 'LCP', '#46D369', 248)}`;
    const rating = m.lcp <= 2500 ? ['Good', 'text-nf-green'] : m.lcp <= 4000 ? ['Needs work', 'text-amber-400'] : ['Poor', 'text-nf-red'];
    $('[data-crp-out="fcp"]', root).textContent = `${(m.fcp / 1000).toFixed(2)} s`;
    $('[data-crp-out="lcp"]', root).textContent = `${(m.lcp / 1000).toFixed(2)} s`;
    const r = $('[data-crp-out="rating"]', root);
    r.textContent = rating[0];
    r.className = rating[1];
  };
  root.addEventListener('change', update);
  update();
}

function initHpaCalc() {
  const root = $('[data-hpa-calc]');
  if (!root) return;
  const c = buildCalc(root, {
    title: 'HPA calculator',
    cols: 'sm:grid-cols-3 lg:grid-cols-5',
    fields: [
      { key: 'cur', label: 'Current replicas', value: 4, attrs: 'min="1" step="1"' },
      { key: 'util', label: 'Average CPU (% of request)', value: 90, attrs: 'min="0" step="1"' },
      { key: 'target', label: 'Target CPU (%)', value: 60, attrs: 'min="1" step="1"' },
      { key: 'min', label: 'minReplicas', value: 3, attrs: 'min="1" step="1"' },
      { key: 'max', label: 'maxReplicas', value: 30, attrs: 'min="1" step="1"' },
    ],
    outputs: [
      { key: 'ratio', label: 'Metric ratio' },
      { key: 'desired', label: 'Desired replicas' },
      { key: 'after', label: 'Expected CPU after scaling' },
    ],
  });
  c.onChange(() => {
    const cur = Math.max(1, Math.round(c.get('cur')));
    const ratio = c.get('util') / Math.max(1, c.get('target'));
    let desired = Math.abs(ratio - 1) <= 0.1 ? cur : Math.ceil(cur * ratio);
    const lo = Math.max(1, Math.round(c.get('min'))), hi = Math.max(lo, Math.round(c.get('max')));
    const clamped = Math.min(hi, Math.max(lo, desired));
    c.set('ratio', ratio.toFixed(2));
    c.set('desired', String(clamped));
    c.set('after', `≈ ${fmtNum((c.get('util') * cur) / clamped)}%`);
    c.note(Math.abs(ratio - 1) <= 0.1
      ? 'Within the 10% tolerance: the HPA leaves the replica count alone.'
      : clamped !== desired
        ? `The formula asks for ${desired}, clamped to the [${lo}, ${hi}] range.`
        : `⌈${cur} × ${ratio.toFixed(2)}⌉ = ${desired}. Scale-downs also wait out the stabilization window.`);
  });
}

function initBurnCalc() {
  const root = $('[data-burn-calc]');
  if (!root) return;
  const c = buildCalc(root, {
    title: 'Error-budget burn calculator',
    fields: [
      { key: 'slo', label: 'SLO (%)', value: 99.9, attrs: 'min="0" max="99.999" step="0.01"' },
      { key: 'days', label: 'SLO window (days)', value: 30, attrs: 'min="1" step="1"' },
      { key: 'err', label: 'Current error rate (%)', value: 1.44, attrs: 'min="0" step="0.01"' },
    ],
    outputs: [
      { key: 'budget', label: 'Budget (error rate)' },
      { key: 'burn', label: 'Burn rate' },
      { key: 'exhaust', label: 'Budget gone in' },
      { key: 'hour', label: 'Budget used per hour' },
    ],
  });
  c.onChange(() => {
    const budget = Math.max(1e-9, 100 - Math.min(99.999, c.get('slo')));
    const burn = c.get('err') / budget;
    const windowMin = c.get('days') * 24 * 60;
    c.set('budget', `${fmtNum(budget, 3)}%`);
    c.set('burn', `${fmtNum(burn, 1)}×`);
    c.set('exhaust', burn > 0 ? fmtDuration(windowMin / burn) : '∞');
    c.set('hour', `${fmtNum((burn / (c.get('days') * 24)) * 100, 2)}%`);
    c.note(burn >= 14.4 ? 'Burn rate ≥ 14.4: page someone now (fast-burn alert).'
      : burn >= 6 ? 'Burn rate ≥ 6: page if it persists over the 6-hour window.'
      : burn > 1 ? 'Burning faster than sustainable: open a ticket.'
      : 'Within budget.');
  });
}

function simulateTokenBucket({ capacity, refill, steady, burst, seconds = 20, burstAt = 5 }) {
  const TICKS = 10;
  let tokens = capacity, carry = 0;
  const perSecond = [];
  const levels = [];
  for (let s = 0; s < seconds; s++) {
    let allowed = 0, rejected = 0;
    for (let k = 0; k < TICKS; k++) {
      tokens = Math.min(capacity, tokens + refill / TICKS);
      carry += steady / TICKS;
      let arrivals = Math.floor(carry);
      carry -= arrivals;
      if (s === burstAt && k === 0) arrivals += burst;
      for (let i = 0; i < arrivals; i++) {
        if (tokens >= 1) { tokens -= 1; allowed++; } else rejected++;
      }
      levels.push(tokens);
    }
    perSecond.push({ allowed, rejected });
  }
  return { perSecond, levels };
}

function initTokenBucket() {
  const root = $('[data-token-bucket]');
  if (!root) return;
  root.className = 'not-prose my-6 rounded-md border border-nf-line bg-nf-card p-5';
  const fields = [['capacity', 'Bucket capacity (burst)', 20], ['refill', 'Refill rate (tokens/s)', 5], ['steady', 'Client steady rate (req/s)', 4], ['burst', 'Burst at t = 5 s (requests)', 40]];
  root.innerHTML = `
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      ${fields.map(([k, l, v]) => `<label class="block text-sm text-neutral-300">${l}<input type="number" min="0" step="1" value="${v}" data-tb="${k}" class="field mt-1" /></label>`).join('')}
    </div>
    <div class="mt-5 overflow-x-auto"><svg viewBox="0 0 680 230" class="h-auto w-full min-w-[520px]" role="img" aria-label="Allowed and rejected requests per second" data-tb-chart></svg></div>
    <div class="mt-2 flex flex-wrap gap-4 text-xs text-nf-muted">
      <span><span class="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-nf-green align-middle"></span>allowed</span>
      <span><span class="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-nf-red align-middle"></span>rejected (429)</span>
      <span><span class="mr-1 inline-block h-0.5 w-4 bg-white align-middle"></span>tokens in bucket</span>
    </div>
    <dl class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="stat-tile"><dt>Allowed</dt><dd data-tb-out="allowed"></dd></div>
      <div class="stat-tile"><dt>Rejected</dt><dd data-tb-out="rejected"></dd></div>
      <div class="stat-tile"><dt>Rejection rate</dt><dd data-tb-out="pct"></dd></div>
    </dl>`;
  const num = (k) => Math.max(0, Number($(`[data-tb="${k}"]`, root).value) || 0);
  const update = () => {
    const capacity = Math.max(1, num('capacity'));
    const r = simulateTokenBucket({ capacity, refill: num('refill'), steady: Math.min(500, num('steady')), burst: Math.min(5000, num('burst')) });
    const X0 = 50, X1 = 670, Y0 = 195, Y1 = 15;
    const maxBar = Math.max(1, ...r.perSecond.map((p) => p.allowed + p.rejected));
    const bw = (X1 - X0) / r.perSecond.length;
    const yb = (v) => (v / maxBar) * (Y0 - Y1);
    const bars = r.perSecond.map((p, i) => {
      const xa = X0 + i * bw + 3, w = bw - 6;
      const ha = yb(p.allowed), hr = yb(p.rejected);
      return `<rect x="${xa}" y="${Y0 - ha}" width="${w}" height="${ha}" fill="#46D369" opacity=".85"/>
              <rect x="${xa}" y="${Y0 - ha - hr}" width="${w}" height="${hr}" fill="#E50914" opacity=".9"/>`;
    }).join('');
    const line = r.levels.map((t, i) => `${(X0 + (i / r.levels.length) * (X1 - X0)).toFixed(1)},${(Y0 - (t / capacity) * (Y0 - Y1)).toFixed(1)}`).join(' ');
    const ticks = [0, 5, 10, 15, 20].map((s) => `<text x="${X0 + (s / 20) * (X1 - X0)}" y="${Y0 + 16}" fill="#a3a3a3" font-size="11" text-anchor="middle" font-family="Inter,sans-serif">${s}s</text>`).join('');
    $('[data-tb-chart]', root).innerHTML = `
      <line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" stroke="#555"/>
      <text x="${X0 - 6}" y="${Y1 + 4}" fill="#a3a3a3" font-size="11" text-anchor="end" font-family="Inter,sans-serif">${maxBar}/s</text>
      ${bars}${ticks}
      <polyline points="${line}" fill="none" stroke="#fff" stroke-width="1.5" opacity=".8"/>`;
    const allowed = r.perSecond.reduce((a, p) => a + p.allowed, 0);
    const rejected = r.perSecond.reduce((a, p) => a + p.rejected, 0);
    $('[data-tb-out="allowed"]', root).textContent = fmtNum(allowed);
    $('[data-tb-out="rejected"]', root).textContent = fmtNum(rejected);
    $('[data-tb-out="pct"]', root).textContent = `${allowed + rejected ? ((rejected / (allowed + rejected)) * 100).toFixed(1) : 0}%`;
  };
  root.addEventListener('input', update);
  update();
}

function initCapstoneCalc() {
  const root = $('[data-capstone-calc]');
  if (!root) return;
  const c = buildCalc(root, {
    title: 'Waiting-room estimator',
    cols: 'sm:grid-cols-3',
    fields: [
      { key: 'visitors', label: 'People in the queue', value: 2000000, attrs: 'min="0" step="100000"' },
      { key: 'L', label: 'Concurrent shoppers checkout can handle', value: 10000, attrs: 'min="1" step="500"' },
      { key: 'W', label: 'Minutes each shopper spends', value: 4, attrs: 'min="0.5" step="0.5"' },
      { key: 'seats', label: 'Seats for sale', value: 50000, attrs: 'min="0" step="1000"' },
      { key: 'tpo', label: 'Tickets per order', value: 2.5, attrs: 'min="1" step="0.5"' },
      { key: 'conv', label: 'Admitted users who buy (%)', value: 60, attrs: 'min="1" max="100" step="5"' },
    ],
    outputs: [
      { key: 'rate', label: 'Admission rate' },
      { key: 'orders', label: 'Orders until sold out' },
      { key: 'sellout', label: 'Time to sell out' },
      { key: 'admitted', label: 'Admitted before sell-out' },
    ],
  });
  c.onChange(() => {
    const rate = c.get('L') / Math.max(0.5, c.get('W'));                       // Little's Law: λ = L / W
    const orders = c.get('seats') / Math.max(1, c.get('tpo'));
    const admittedNeeded = orders / (Math.max(1, c.get('conv')) / 100);
    const admitted = Math.min(c.get('visitors'), admittedNeeded);
    c.set('rate', `${fmtNum(rate)}/min`);
    c.set('orders', fmtNum(orders));
    c.set('sellout', admittedNeeded > c.get('visitors') ? 'never (not enough buyers)' : fmtDuration(admittedNeeded / rate));
    c.set('admitted', `${fmtNum(admitted)} (${fmtNum((admitted / Math.max(1, c.get('visitors'))) * 100, 1)}%)`);
    c.note(`Everyone after position ${fmtNum(admitted)} should be told "sold out" promptly rather than kept waiting.`);
  });
}

/* ---------------------------------------------------------------------------
 * Boot
 * ------------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  validateBank();
  renderComingSoon();
  renderModuleRow();
  renderTOC();
  Drawer.init();
  initTabs();
  initCodeBlocks();
  renderLatencyChart();
  initLittlesLaw();
  initAvailability();
  initStepper();
  initLbSim();
  initHitRatio();
  initShardSim();
  initQueueSim();
  initChainCalc();
  initCrpSim();
  initHpaCalc();
  initBurnCalc();
  initTokenBucket();
  initCapstoneCalc();
  $$('[data-quiz]').forEach(renderQuiz);
  Progress.initReset();
  Progress.observe();
  Progress.refresh();
  initChrome();
});
