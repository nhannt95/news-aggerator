<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once __DIR__ . '/db.php';

$method = strtoupper($_SERVER['REQUEST_METHOD']);
$path   = isset($_GET['path']) ? trim($_GET['path'], '/') : '';
$seg    = $path !== '' ? explode('/', $path) : array();
$body   = (array) json_decode(file_get_contents('php://input'), true);

function ok($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function err($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(array('error' => $msg));
    exit;
}
function requireFields($body, $fields) {
    foreach ($fields as $f) {
        if (!isset($body[$f]) || $body[$f] === '') err("Field '$f' is required");
    }
}
function castBool(&$rows, $fields) {
    foreach ($rows as &$r) {
        foreach ($fields as $f) {
            if (array_key_exists($f, $r)) $r[$f] = (bool) $r[$f];
        }
    }
}
function castJson(&$rows, $fields) {
    foreach ($rows as &$r) {
        foreach ($fields as $f) {
            if (isset($r[$f])) $r[$f] = json_decode($r[$f]);
        }
    }
}
function seg($arr, $i, $default = null) {
    return isset($arr[$i]) ? $arr[$i] : $default;
}
function bodyVal($body, $key, $default = '') {
    return isset($body[$key]) ? $body[$key] : $default;
}
function generateUUID() {
    $b = function_exists('random_bytes') ? random_bytes(16) : openssl_random_pseudo_bytes(16);
    $b[6] = chr(ord($b[6]) & 0x0f | 0x40);
    $b[8] = chr(ord($b[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

try {
    $db = getDb();

    $s0 = seg($seg, 0, '');
    $s1 = seg($seg, 1);
    $s2 = seg($seg, 2);
    $s3 = seg($seg, 3);

    // ── /users ────────────────────────────────────────────────────────────────
    if ($s0 === 'users') {
        if (!$s1) {
            if ($method === 'GET') {
                if (!empty($_GET['q'])) {
                    $q    = trim($_GET['q']);
                    $stmt = $db->prepare('SELECT id, email AS knoxid, name, department, group_name, team, status FROM na_users WHERE email = ? LIMIT 1');
                    $stmt->execute(array($q));
                    $u = $stmt->fetch();
                    if (!$u) err('Knox ID không tồn tại trong hệ thống.', 404);
                    ok($u);
                }
                ok($db->query('SELECT id, email AS knoxid, name, department, group_name, team, role, status, created_at FROM na_users ORDER BY created_at DESC')->fetchAll());
            }
            if ($method === 'POST') {
                requireFields($body, array('email', 'name'));
                $db->prepare('INSERT INTO na_users (email, name, role, status, department, group_name, team) VALUES (?, ?, ?, ?, ?, ?, ?)')
                   ->execute(array($body['email'], $body['name'], bodyVal($body, 'role', 'viewer'), bodyVal($body, 'status', 'active'), bodyVal($body, 'department'), bodyVal($body, 'group_name'), bodyVal($body, 'team')));
                ok(array('id' => (int) $db->lastInsertId()), 201);
            }
        } else {
            $uid = (int) $s1;
            if ($method === 'PUT') {
                requireFields($body, array('email', 'name'));
                $db->prepare('UPDATE na_users SET email=?, name=?, role=?, status=?, department=?, group_name=?, team=? WHERE id=?')
                   ->execute(array($body['email'], $body['name'], bodyVal($body, 'role', 'viewer'), bodyVal($body, 'status', 'active'), bodyVal($body, 'department'), bodyVal($body, 'group_name'), bodyVal($body, 'team'), $uid));
                ok(array('ok' => true));
            }
            if ($method === 'DELETE') {
                $db->prepare('DELETE FROM na_users WHERE id=?')->execute(array($uid));
                ok(array('ok' => true));
            }
        }
    }

    // ── /projects ─────────────────────────────────────────────────────────────
    if ($s0 === 'projects') {
        $name   = $s1;
        $sub    = $s2;
        $subKey = $s3;

        // /projects
        if (!$name) {
            if ($method === 'GET') {
                $rows = $db->query('SELECT * FROM na_project_runtime_configs ORDER BY project_name')->fetchAll();
                foreach ($rows as &$r) {
                    $r['enabled']          = (bool) $r['enabled'];
                    $r['require_approval'] = (bool) $r['require_approval'];
                    $meta = json_decode(isset($r['metadata']) ? $r['metadata'] : '{}', true);
                    if (!$meta) $meta = array();
                    $r['metadata'] = array(
                        'name'        => isset($meta['name'])        ? $meta['name']        : '',
                        'description' => isset($meta['description']) ? $meta['description'] : '',
                        'owner'       => isset($meta['owner'])       ? $meta['owner']       : '',
                    );
                }
                ok($rows);
            }
            if ($method === 'POST') {
                requireFields($body, array('project_name'));
                $meta = json_encode(array('name' => bodyVal($body, 'name'), 'description' => bodyVal($body, 'description'), 'owner' => bodyVal($body, 'owner')));
                $uuid = generateUUID();
                $db->prepare('INSERT INTO na_project_runtime_configs (project_name, project_id, version, enabled, require_approval, metadata) VALUES (?, ?, ?, ?, ?, ?)')
                   ->execute(array($body['project_name'], $uuid, bodyVal($body, 'version', '1.0.0'), empty($body['enabled']) ? 0 : 1, empty($body['require_approval']) ? 0 : 1, $meta));
                ok(array('project_name' => $body['project_name'], 'project_id' => $uuid), 201);
            }
        }

        // /projects/{name}
        if ($name && !$sub) {
            if ($method === 'GET') {
                $stmt = $db->prepare('SELECT * FROM na_project_runtime_configs WHERE project_name = ?');
                $stmt->execute(array($name));
                $p = $stmt->fetch();
                if (!$p) err('Project not found', 404);

                $stmt2 = $db->prepare('SELECT * FROM na_agent_configs WHERE project_name = ? ORDER BY id');
                $stmt2->execute(array($name));
                $agents = $stmt2->fetchAll();
                castBool($agents, array('enabled', 'verbose', 'allow_delegation'));
                castJson($agents, array('tools'));

                $stmt3 = $db->prepare('SELECT * FROM na_task_configs WHERE project_name = ? ORDER BY id');
                $stmt3->execute(array($name));
                $tasks = $stmt3->fetchAll();
                castBool($tasks, array('enabled'));
                castJson($tasks, array('context_task_keys'));

                $p['enabled']          = (bool) $p['enabled'];
                $p['require_approval'] = (bool) $p['require_approval'];
                $meta = json_decode(isset($p['metadata']) ? $p['metadata'] : '{}', true);
                if (!$meta) $meta = array();
                $p['metadata'] = array(
                    'name'        => isset($meta['name'])        ? $meta['name']        : '',
                    'description' => isset($meta['description']) ? $meta['description'] : '',
                    'owner'       => isset($meta['owner'])       ? $meta['owner']       : '',
                );
                $p['agents'] = $agents;
                $p['tasks']  = $tasks;
                ok($p);
            }
            if ($method === 'PUT') {
                $meta = json_encode(array('name' => bodyVal($body, 'name'), 'description' => bodyVal($body, 'description'), 'owner' => bodyVal($body, 'owner')));
                $db->prepare('UPDATE na_project_runtime_configs SET version=?, enabled=?, require_approval=?, metadata=? WHERE project_name=?')
                   ->execute(array(bodyVal($body, 'version', '1.0.0'), empty($body['enabled']) ? 0 : 1, empty($body['require_approval']) ? 0 : 1, $meta, $name));
                ok(array('ok' => true));
            }
            if ($method === 'DELETE') {
                $db->prepare('DELETE FROM na_project_runtime_configs WHERE project_name=?')->execute(array($name));
                ok(array('ok' => true));
            }
        }

        // /projects/{name}/agents[/{key}]
        if ($name && $sub === 'agents') {
            if (!$subKey) {
                if ($method === 'GET') {
                    $stmt = $db->prepare('SELECT * FROM na_agent_configs WHERE project_name = ? ORDER BY id');
                    $stmt->execute(array($name));
                    $rows = $stmt->fetchAll();
                    castBool($rows, array('enabled', 'verbose', 'allow_delegation'));
                    castJson($rows, array('tools'));
                    ok($rows);
                }
                if ($method === 'POST') {
                    requireFields($body, array('agent_key', 'role', 'goal', 'backstory'));
                    $db->prepare('INSERT INTO na_agent_configs (project_name, agent_key, role, goal, backstory, tools, llm, verbose, allow_delegation, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                       ->execute(array($name, $body['agent_key'], $body['role'], $body['goal'], $body['backstory'], json_encode(bodyVal($body, 'tools', array())), bodyVal($body, 'llm'), empty($body['verbose']) ? 0 : 1, empty($body['allow_delegation']) ? 0 : 1, empty($body['enabled']) ? 0 : 1));
                    ok(array('id' => (int) $db->lastInsertId()), 201);
                }
            } else {
                if ($method === 'PUT') {
                    $db->prepare('UPDATE na_agent_configs SET role=?, goal=?, backstory=?, tools=?, llm=?, verbose=?, allow_delegation=?, enabled=? WHERE project_name=? AND agent_key=?')
                       ->execute(array(bodyVal($body, 'role'), bodyVal($body, 'goal'), bodyVal($body, 'backstory'), json_encode(bodyVal($body, 'tools', array())), bodyVal($body, 'llm'), empty($body['verbose']) ? 0 : 1, empty($body['allow_delegation']) ? 0 : 1, empty($body['enabled']) ? 0 : 1, $name, $subKey));
                    ok(array('ok' => true));
                }
                if ($method === 'DELETE') {
                    $db->prepare('DELETE FROM na_agent_configs WHERE project_name=? AND agent_key=?')->execute(array($name, $subKey));
                    ok(array('ok' => true));
                }
            }
        }

        // /projects/{name}/tasks[/{key}]
        if ($name && $sub === 'tasks') {
            if (!$subKey) {
                if ($method === 'GET') {
                    $stmt = $db->prepare('SELECT * FROM na_task_configs WHERE project_name = ? ORDER BY id');
                    $stmt->execute(array($name));
                    $rows = $stmt->fetchAll();
                    castBool($rows, array('enabled'));
                    castJson($rows, array('context_task_keys'));
                    ok($rows);
                }
                if ($method === 'POST') {
                    requireFields($body, array('task_key', 'agent_key', 'description', 'expected_output'));
                    $db->prepare('INSERT INTO na_task_configs (project_name, task_key, description, expected_output, agent_key, context_task_keys, output_key, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                       ->execute(array($name, $body['task_key'], $body['description'], $body['expected_output'], $body['agent_key'], json_encode(bodyVal($body, 'context_task_keys', array())), bodyVal($body, 'output_key'), empty($body['enabled']) ? 0 : 1));
                    ok(array('id' => (int) $db->lastInsertId()), 201);
                }
            } else {
                if ($method === 'PUT') {
                    $db->prepare('UPDATE na_task_configs SET description=?, expected_output=?, agent_key=?, context_task_keys=?, output_key=?, enabled=? WHERE project_name=? AND task_key=?')
                       ->execute(array(bodyVal($body, 'description'), bodyVal($body, 'expected_output'), bodyVal($body, 'agent_key'), json_encode(bodyVal($body, 'context_task_keys', array())), bodyVal($body, 'output_key'), empty($body['enabled']) ? 0 : 1, $name, $subKey));
                    ok(array('ok' => true));
                }
                if ($method === 'DELETE') {
                    $db->prepare('DELETE FROM na_task_configs WHERE project_name=? AND task_key=?')->execute(array($name, $subKey));
                    ok(array('ok' => true));
                }
            }
        }

        // /projects/{name}/email-recipients[/{id}]
        if ($name && $sub === 'email-recipients') {
            if (!$subKey) {
                if ($method === 'GET') {
                    $stmt = $db->prepare('SELECT * FROM na_email_recipients WHERE project_name = ?');
                    $stmt->execute(array($name));
                    ok($stmt->fetchAll());
                }
                if ($method === 'POST') {
                    requireFields($body, array('email'));
                    $db->prepare('INSERT INTO na_email_recipients (project_name, task_key, email, recipient_type, name) VALUES (?, ?, ?, ?, ?)')
                       ->execute(array($name, bodyVal($body, 'task_key'), $body['email'], bodyVal($body, 'recipient_type', 'user'), bodyVal($body, 'name')));
                    ok(array('id' => (int) $db->lastInsertId()), 201);
                }
            } else {
                if ($method === 'DELETE') {
                    $db->prepare('DELETE FROM na_email_recipients WHERE id=? AND project_name=?')->execute(array((int) $subKey, $name));
                    ok(array('ok' => true));
                }
            }
        }

        // /projects/{name}/access[/{id}]
        if ($name && $sub === 'access') {
            if (!$subKey) {
                if ($method === 'GET') {
                    $stmt = $db->prepare('SELECT pa.id, pa.project_name, pa.user_id, pa.role, pa.granted_at, u.email AS knoxid, u.name, u.status FROM na_project_access pa JOIN na_users u ON pa.user_id = u.id WHERE pa.project_name = ?');
                    $stmt->execute(array($name));
                    ok($stmt->fetchAll());
                }
                if ($method === 'POST') {
                    // Accept knoxid (email) or user_id directly
                    if (isset($body['knoxid']) && $body['knoxid'] !== '') {
                        $knoxid = trim($body['knoxid']);
                        $s = $db->prepare('SELECT id FROM na_users WHERE email = ?');
                        $s->execute(array($knoxid));
                        $u = $s->fetch();
                        if ($u) {
                            $userId = (int) $u['id'];
                        } else {
                            $db->prepare('INSERT INTO na_users (email, name, role, status) VALUES (?, ?, ?, ?)')
                               ->execute(array($knoxid, bodyVal($body, 'name', $knoxid), 'viewer', 'active'));
                            $userId = (int) $db->lastInsertId();
                        }
                    } elseif (isset($body['user_id'])) {
                        $userId = (int) $body['user_id'];
                    } else {
                        err('knoxid or user_id required', 400);
                    }
                    $db->prepare('INSERT INTO na_project_access (project_name, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role=VALUES(role)')
                       ->execute(array($name, $userId, bodyVal($body, 'role', 'viewer')));
                    ok(array('ok' => true), 201);
                }
            } else {
                if ($method === 'DELETE') {
                    $db->prepare('DELETE FROM na_project_access WHERE id=? AND project_name=?')->execute(array((int) $subKey, $name));
                    ok(array('ok' => true));
                }
            }
        }

        // /projects/{name}/logs[/{id}]
        if ($name && $sub === 'logs') {
            if (!$subKey) {
                if ($method === 'GET') {
                    $where  = array('project_name = ?');
                    $params = array($name);
                    if (!empty($_GET['agent_key'])) {
                        $where[]  = 'agent_key = ?';
                        $params[] = $_GET['agent_key'];
                    }
                    if (!empty($_GET['status'])) {
                        $where[]  = 'status = ?';
                        $params[] = $_GET['status'];
                    }
                    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;
                    $sql   = 'SELECT id, project_name, agent_key, task_key, run_id, status, started_at, finished_at, duration_ms, error_msg, LEFT(log_text, 500) AS log_preview FROM na_agent_run_logs WHERE ' . implode(' AND ', $where) . ' ORDER BY started_at DESC LIMIT ' . $limit;
                    $stmt  = $db->prepare($sql);
                    $stmt->execute($params);
                    ok($stmt->fetchAll());
                }
                if ($method === 'POST') {
                    requireFields($body, array('agent_key'));
                    $db->prepare('INSERT INTO na_agent_run_logs (project_name, agent_key, task_key, run_id, status, log_text) VALUES (?, ?, ?, ?, ?, ?)')
                       ->execute(array($name, $body['agent_key'], bodyVal($body, 'task_key'), bodyVal($body, 'run_id'), bodyVal($body, 'status', 'running'), bodyVal($body, 'log_text')));
                    ok(array('id' => (int) $db->lastInsertId()), 201);
                }
            } else {
                $logId = (int) $subKey;
                if ($method === 'GET') {
                    // full log text
                    $stmt = $db->prepare('SELECT * FROM na_agent_run_logs WHERE id=? AND project_name=?');
                    $stmt->execute(array($logId, $name));
                    $row = $stmt->fetch();
                    if (!$row) err('Log not found', 404);
                    ok($row);
                }
                if ($method === 'PUT') {
                    // update status / finished_at / duration / log_text
                    $db->prepare('UPDATE na_agent_run_logs SET status=?, finished_at=?, duration_ms=?, log_text=CONCAT(IFNULL(log_text,""),?), error_msg=? WHERE id=? AND project_name=?')
                       ->execute(array(bodyVal($body, 'status', 'running'), bodyVal($body, 'finished_at'), isset($body['duration_ms']) ? (int) $body['duration_ms'] : null, bodyVal($body, 'log_text'), bodyVal($body, 'error_msg'), $logId, $name));
                    ok(array('ok' => true));
                }
                if ($method === 'DELETE') {
                    $db->prepare('DELETE FROM na_agent_run_logs WHERE id=? AND project_name=?')->execute(array($logId, $name));
                    ok(array('ok' => true));
                }
            }
        }
    }

    // ── /news-sites[/{site_id}] ───────────────────────────────────────────────
    if ($s0 === 'news-sites') {
        $siteId = $s1;
        if (!$siteId) {
            if ($method === 'GET') {
                if (!empty($_GET['project_name'])) {
                    $stmt = $db->prepare('SELECT * FROM na_news_sites WHERE project_name = ? ORDER BY name');
                    $stmt->execute(array($_GET['project_name']));
                } else {
                    $stmt = $db->query('SELECT * FROM na_news_sites ORDER BY project_name, name');
                }
                $rows = $stmt->fetchAll();
                castBool($rows, array('active'));
                ok($rows);
            }
            if ($method === 'POST') {
                requireFields($body, array('project_name', 'latest_page_url'));
                // Auto-generate site_id if not provided
                if (!empty($body['site_id'])) {
                    $siteId = $body['site_id'];
                } else {
                    $prefix = preg_replace('/[^a-z0-9]/', '', strtolower(bodyVal($body, 'project_name', 'src')));
                    $prefix = substr($prefix, 0, 8);
                    $siteId = null;
                    do {
                        $candidate = $prefix . '_' . substr(bin2hex(openssl_random_pseudo_bytes(3)), 0, 6);
                        $chk = $db->prepare('SELECT 1 FROM na_news_sites WHERE site_id = ?');
                        $chk->execute(array($candidate));
                        if (!$chk->fetch()) $siteId = $candidate;
                    } while ($siteId === null);
                }
                $db->prepare('INSERT INTO na_news_sites (site_id, project_name, name, latest_page_url, domain, language, listing_selector, content_selector, article_url_pattern, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                   ->execute(array($siteId, $body['project_name'], bodyVal($body, 'name'), $body['latest_page_url'], bodyVal($body, 'domain'), bodyVal($body, 'language', 'vi'), bodyVal($body, 'listing_selector'), bodyVal($body, 'content_selector'), bodyVal($body, 'article_url_pattern'), empty($body['active']) ? 0 : 1));
                ok(array('site_id' => $siteId), 201);
            }
        } else {
            if ($method === 'PUT') {
                $db->prepare('UPDATE na_news_sites SET name=?, latest_page_url=?, domain=?, language=?, listing_selector=?, content_selector=?, article_url_pattern=?, active=?, project_name=? WHERE site_id=?')
                   ->execute(array(bodyVal($body, 'name'), bodyVal($body, 'latest_page_url'), bodyVal($body, 'domain'), bodyVal($body, 'language', 'vi'), bodyVal($body, 'listing_selector'), bodyVal($body, 'content_selector'), bodyVal($body, 'article_url_pattern'), empty($body['active']) ? 0 : 1, bodyVal($body, 'project_name'), $siteId));
                ok(array('ok' => true));
            }
            if ($method === 'DELETE') {
                $db->prepare('DELETE FROM na_news_sites WHERE site_id=?')->execute(array($siteId));
                ok(array('ok' => true));
            }
        }
    }

    // ── /scheduler/configs[/{job_id}] ─────────────────────────────────────────
    if ($s0 === 'scheduler' && $s1 === 'configs') {
        $jobId = $s2;
        if (!$jobId) {
            if ($method === 'GET') {
                if (!empty($_GET['project_name'])) {
                    $stmt = $db->prepare('SELECT * FROM na_scheduler_configs WHERE project_name = ?');
                    $stmt->execute(array($_GET['project_name']));
                } else {
                    $stmt = $db->query('SELECT * FROM na_scheduler_configs');
                }
                $rows = $stmt->fetchAll();
                castBool($rows, array('enabled'));
                castJson($rows, array('trigger_args', 'input_payload'));
                ok($rows);
            }
            if ($method === 'POST') {
                requireFields($body, array('project_name', 'trigger_type'));
                // Auto-generate unique job_id: {project_name}_{6-char hex}
                do {
                    $jobId = $body['project_name'] . '_' . substr(bin2hex(openssl_random_pseudo_bytes(3)), 0, 6);
                    $chk   = $db->prepare('SELECT job_id FROM na_scheduler_configs WHERE job_id = ?');
                    $chk->execute(array($jobId));
                } while ($chk->fetch());
                $db->prepare('INSERT INTO na_scheduler_configs (job_id, project_name, trigger_type, trigger_args, input_payload, enabled, timezone) VALUES (?, ?, ?, ?, ?, ?, ?)')
                   ->execute(array($jobId, $body['project_name'], $body['trigger_type'], json_encode(bodyVal($body, 'trigger_args', new stdClass)), json_encode(bodyVal($body, 'input_payload', new stdClass)), empty($body['enabled']) ? 0 : 1, bodyVal($body, 'timezone', 'Asia/Ho_Chi_Minh')));
                ok(array('job_id' => $jobId), 201);
            }
        } else {
            if ($method === 'PUT') {
                $db->prepare('UPDATE na_scheduler_configs SET trigger_type=?, trigger_args=?, input_payload=?, enabled=?, timezone=? WHERE job_id=?')
                   ->execute(array(bodyVal($body, 'trigger_type', 'cron'), json_encode(bodyVal($body, 'trigger_args', new stdClass)), json_encode(bodyVal($body, 'input_payload', new stdClass)), empty($body['enabled']) ? 0 : 1, bodyVal($body, 'timezone', 'Asia/Ho_Chi_Minh'), $jobId));
                ok(array('ok' => true));
            }
            if ($method === 'DELETE') {
                $db->prepare('DELETE FROM na_scheduler_configs WHERE job_id=?')->execute(array($jobId));
                ok(array('ok' => true));
            }
        }
    }

    // ── /articles[/{id}] ─────────────────────────────────────────────────────
    if ($s0 === 'articles') {
        $artId = seg($seg, 1, '');

        if (!$artId) {
            // GET /articles
            if ($method === 'GET') {
                $where  = array();
                $params = array();
                if (!empty($_GET['project_name'])) { $where[] = 'a.project_name = ?'; $params[] = $_GET['project_name']; }
                if (!empty($_GET['status']))        { $where[] = 'a.status = ?';       $params[] = $_GET['status']; }
                if (isset($_GET['is_relevant']) && $_GET['is_relevant'] !== '') {
                    $where[] = 'a.is_relevant = ?'; $params[] = (int) $_GET['is_relevant'];
                }
                $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 200;
                $sql  = 'SELECT a.id, a.project_id, a.project_name, p.metadata AS project_meta, a.site_id, a.article_url AS url, a.title, a.published_at, a.published_at_vn, a.is_relevant, a.relevance_score, a.status, a.approved_by, a.approved_at FROM na_processed_articles a LEFT JOIN na_project_runtime_configs p ON a.project_id = p.project_id';
                $sql .= $where ? ' WHERE ' . implode(' AND ', $where) : '';
                $sql .= ' ORDER BY a.created_at DESC LIMIT ' . $limit;
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $rows = $stmt->fetchAll();
                castBool($rows, array('is_relevant'));
                foreach ($rows as &$r) {
                    $r['relevance_score'] = (int) $r['relevance_score'];
                    if (empty($r['published_at_vn']) && !empty($r['published_at'])) {
                        $r['published_at_vn'] = date('d/m/Y H:i', strtotime($r['published_at']));
                    }
                    $meta = json_decode(isset($r['project_meta']) ? $r['project_meta'] : '{}', true);
                    $r['project_display_name'] = ($meta && isset($meta['name']) && $meta['name'] !== '') ? $meta['name'] : $r['project_name'];
                    unset($r['project_meta']);
                }
                ok($rows);
            }
            // POST /articles  — manual article submission
            if ($method === 'POST') {
                requireFields($body, array('project_name', 'article_url'));
                $chk = $db->prepare('SELECT id FROM na_processed_articles WHERE article_url = ?');
                $chk->execute(array($body['article_url']));
                if ($chk->fetch()) err('URL này đã có trong hệ thống.', 409);
                // Resolve project_id
                $ps = $db->prepare('SELECT project_id FROM na_project_runtime_configs WHERE project_name = ?');
                $ps->execute(array($body['project_name']));
                $proj = $ps->fetch();
                $projId = $proj ? $proj['project_id'] : null;
                $db->prepare('INSERT INTO na_processed_articles (project_name, project_id, site_id, article_url, title, status) VALUES (?, ?, ?, ?, ?, ?)')
                   ->execute(array($body['project_name'], $projId, bodyVal($body, 'site_id', 'manual'), $body['article_url'], bodyVal($body, 'title'), 'pending'));
                ok(array('id' => (int) $db->lastInsertId()), 201);
            }
        } else {
            // PUT /articles/{id}  — approve / reject / update status
            if ($method === 'PUT') {
                $status = bodyVal($body, 'status', 'pending');
                $approvedBy = bodyVal($body, 'approved_by');
                $approvedAt = in_array($status, array('approved', 'rejected')) ? date('Y-m-d H:i:s') : null;
                $db->prepare('UPDATE na_processed_articles SET status=?, approved_by=?, approved_at=?, approval_notes=? WHERE id=?')
                   ->execute(array($status, $approvedBy ?: null, $approvedAt, bodyVal($body, 'approval_notes'), (int) $artId));
                ok(array('ok' => true));
            }
            // DELETE /articles/{id}
            if ($method === 'DELETE') {
                $db->prepare('DELETE FROM na_processed_articles WHERE id=?')->execute(array((int) $artId));
                ok(array('ok' => true));
            }
        }
    }

    err('Route not found', 404);

} catch (PDOException $e) {
    err('DB error: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    err($e->getMessage(), 500);
}
