const MockData = {
    projects: [
        {
            project_name: 'legal_task',
            version: '2026-04-07.1',
            enabled: true,
            require_approval: true,
            run_status: 'idle',
            metadata: { description: 'Legal monitoring workflow', owner: 'legal-team' },
        },
        {
            project_name: 'er_task',
            version: '2026-04-07.1',
            enabled: true,
            require_approval: false,
            run_status: 'running',
            metadata: { description: 'ER monitoring workflow', owner: 'ops-team' },
        },
        {
            project_name: 'legal_task_report',
            version: '2026-04-08.1',
            enabled: true,
            require_approval: false,
            run_status: 'idle',
            metadata: { description: 'Legal reporting workflow', owner: 'legal-team' },
        },
    ],

    agents: {
        legal_task: [
            { agent_key: 'title_screener', role: 'Legal News Title Screener',
              goal: 'Quickly screen article titles to identify potentially relevant legal news.',
              backstory: 'Pre-filters articles by title before expensive content analysis.',
              tools: [], llm: 'openrouter/google/gemini-2.0-flash-exp:free',
              verbose: true, allow_delegation: false, enabled: true },
            { agent_key: 'classifier', role: 'Legal News Classifier',
              goal: 'Classify legal articles by relevance, topic, and urgency.',
              backstory: 'Performs deep classification on pre-screened articles.',
              tools: [], llm: 'openrouter/google/gemini-2.0-flash-exp:free',
              verbose: true, allow_delegation: false, enabled: true },
            { agent_key: 'summary', role: 'Article Summarizer',
              goal: 'Read the article and produce a concise summary, analysis, and recommendation.',
              backstory: 'Expert at reading news articles and extracting key information.',
              tools: [], llm: 'openrouter/google/gemini-2.0-flash-exp:free',
              verbose: true, allow_delegation: false, enabled: true },
            { agent_key: 'translator', role: 'Article Translator',
              goal: 'Translate title, summary, content, analysis, recommendation into target language.',
              backstory: 'Professional translator, always returns JSON with 5 keys.',
              tools: [], llm: 'openrouter/google/gemini-2.0-flash-exp:free',
              verbose: true, allow_delegation: false, enabled: true },
        ],
        er_task: [
            { agent_key: 'classifier', role: 'ER News Classifier',
              goal: 'Classify ER articles by urgency, impact, and severity.',
              backstory: 'Screens emergency-response news.',
              tools: [], llm: 'ollama/llama3.2:1b',
              verbose: true, allow_delegation: false, enabled: true },
            { agent_key: 'reporter', role: 'ER Report Writer',
              goal: 'Write concise ER reports.',
              backstory: 'Converts urgent article signals into operational output.',
              tools: [], llm: 'ollama/llama3.2:1b',
              verbose: true, allow_delegation: false, enabled: true },
        ],
        legal_task_report: [
            { agent_key: 'reporter', role: 'Legal Report Writer',
              goal: 'Write legal reports from summarized findings.',
              backstory: 'Produces report outputs.',
              tools: [], llm: 'openai/gpt-4o-mini',
              verbose: true, allow_delegation: false, enabled: true },
        ],
    },

    tasks: {
        legal_task: [
            { task_key: 'screen_titles', agent_key: 'title_screener',
              description: 'Review article titles and select those relevant to legal topics.',
              expected_output: 'A JSON list of article URLs that passed screening.',
              context_task_keys: [], output_key: 'title_screening_result', enabled: true },
            { task_key: 'classify_articles', agent_key: 'classifier',
              description: 'Classify the legal article by topic and urgency based on full content.',
              expected_output: 'A structured classification result.',
              context_task_keys: [], output_key: 'classification_result', enabled: true },
            { task_key: 'summarize_article', agent_key: 'summary',
              description: 'Read article and return JSON with title, summary, analysis, recommendation in {source_language}.',
              expected_output: 'JSON: {title, summary, analysis, recommendation}',
              context_task_keys: [], output_key: 'summary_result', enabled: true },
            { task_key: 'translate_summary', agent_key: 'translator',
              description: 'Translate title, summary, content, analysis, recommendation from {source_language} to {target_language}.',
              expected_output: 'JSON: {title, summary, content, analysis, recommendation}',
              context_task_keys: [], output_key: 'translation_result', enabled: true },
            { task_key: 'write_report', agent_key: 'classifier',
              description: 'Write final legal report from classified articles.',
              expected_output: 'A concise legal report.',
              context_task_keys: ['classify_articles'], output_key: 'report_result', enabled: false },
        ],
        er_task: [
            { task_key: 'classify_articles', agent_key: 'classifier',
              description: 'Classify crawled ER articles by urgency and severity.',
              expected_output: 'A structured classified list.',
              context_task_keys: [], output_key: 'classification_result', enabled: true },
            { task_key: 'write_report', agent_key: 'reporter',
              description: 'Write the final ER report.',
              expected_output: 'A concise ER report.',
              context_task_keys: ['classify_articles'], output_key: 'report_result', enabled: true },
        ],
        legal_task_report: [
            { task_key: 'write_report', agent_key: 'reporter',
              description: 'Write the final legal report from summary and translations.',
              expected_output: 'A concise legal report.',
              context_task_keys: [], output_key: 'report_result', enabled: true },
        ],
    },

    emails: {
        legal_task: [
            { id: 1, task_key: 'classify_articles', email: 'legal@company.com',
              name: 'Legal Team', recipient_type: 'department', enabled: true },
            { id: 2, task_key: 'classify_articles', email: 'admin@company.com',
              name: 'Admin', recipient_type: 'user', enabled: true },
            { id: 3, task_key: 'summarize_article', email: 'compliance-group@company.com',
              name: 'Compliance Group', recipient_type: 'group', enabled: true },
            { id: 4, task_key: 'translate_summary', email: 'translator@company.com',
              name: 'Translator', recipient_type: 'user', enabled: true },
        ],
        er_task: [
            { id: 5, task_key: 'write_report', email: 'ops@company.com',
              name: 'Ops Team', recipient_type: 'department', enabled: true },
        ],
        legal_task_report: [],
    },

    access: {
        legal_task: [
            { id: 1, email: 'admin@company.com', name: 'Admin User', role: 'admin', granted_at: '2026-04-01 10:00:00' },
            { id: 2, email: 'legal-manager@company.com', name: 'Legal Manager', role: 'editor', granted_at: '2026-04-05 14:30:00' },
            { id: 3, email: 'analyst@company.com', name: 'Analyst', role: 'viewer', granted_at: '2026-04-10 09:15:00' },
        ],
        er_task: [
            { id: 4, email: 'ops-lead@company.com', name: 'Ops Lead', role: 'admin', granted_at: '2026-04-02 11:00:00' },
        ],
        legal_task_report: [],
    },

    sources: [
        { site_id: 'tn-legal-1', name: 'Bao Thanh Nien', domain: 'thanhnien.vn',
          project_name: 'legal_task', language: 'vi', fetch_method: 'sitemap', active: true },
        { site_id: 'dt-legal-1', name: 'Bao Dan Tri', domain: 'dantri.com.vn',
          project_name: 'legal_task', language: 'vi', fetch_method: 'listing', active: true },
        { site_id: 'vnx-er-1', name: 'VnExpress', domain: 'vnexpress.net',
          project_name: 'er_task', language: 'vi', fetch_method: 'sitemap', active: false },
    ],

    schedulers: [
        { job_id: 'legal_task_ingest', project_name: 'legal_task',
          trigger_type: 'cron', trigger_args: { hour: '0,6,12', minute: 0 },
          enabled: true, timezone: 'Asia/Ho_Chi_Minh' },
        { job_id: 'legal_task_report_14h', project_name: 'legal_task_report',
          trigger_type: 'cron', trigger_args: { hour: 14, minute: 0 },
          enabled: true, timezone: 'Asia/Ho_Chi_Minh' },
        { job_id: 'er_task_every_15m', project_name: 'er_task',
          trigger_type: 'cron', trigger_args: { minute: '*/15' },
          enabled: true, timezone: 'Asia/Ho_Chi_Minh' },
    ],

    articles: [
        {
            id: 1, title: 'Quốc hội thông qua Luật Đất đai sửa đổi',
            project_name: 'legal_task', source: 'Thanh Niên', source_language: 'vi',
            topics: ['Land Law', 'Policy'],
            url: 'https://thanhnien.vn/quoc-hoi-thong-qua-luat-dat-dai-sua-doi-185260415083000000.htm',
            relevance_score: 92, is_relevant: true, published_at_vn: '15/04/2026 08:30 ICT',
            translations: {
                vi: {
                    title: 'Quốc hội thông qua Luật Đất đai sửa đổi',
                    summary: 'Luật Đất đai sửa đổi 2026 được Quốc hội thông qua với 92% đại biểu tán thành. Luật có hiệu lực từ 01/07/2026, tập trung giải quyết các vấn đề thu hồi đất, bồi thường, tái định cư và quản lý đất đai công.',
                    content: 'Sáng nay 15/4, Quốc hội đã chính thức thông qua Luật Đất đai sửa đổi với tỷ lệ tán thành cao. Luật mới có nhiều điểm đột phá về quyền sử dụng đất, thủ tục thu hồi và bồi thường...\n\nMột số thay đổi quan trọng:\n- Minh bạch hóa quy trình thu hồi đất\n- Tăng mức bồi thường theo giá thị trường\n- Quy định rõ trách nhiệm của chính quyền địa phương',
                    analysis: 'Luật sửa đổi này có tác động lớn đến thị trường bất động sản và doanh nghiệp đầu tư. Các dự án đang triển khai cần rà soát lại quy trình pháp lý để phù hợp với quy định mới.',
                    recommendation: 'Doanh nghiệp nên rà soát các hợp đồng đất đai đang có hiệu lực và tham vấn luật sư để điều chỉnh phù hợp. Các dự án trong giai đoạn đàm phán nên hoãn ký kết đến khi có hướng dẫn chi tiết.',
                },
                en: {
                    title: 'National Assembly passes amended Land Law',
                    summary: 'The amended 2026 Land Law was approved by the National Assembly with 92% of delegates in favor. The law takes effect on July 1, 2026, focusing on land recovery, compensation, resettlement, and public land management.',
                    content: 'This morning, April 15, the National Assembly officially passed the amended Land Law with a high approval rate. The new law brings breakthrough changes to land use rights, recovery procedures, and compensation...\n\nKey changes:\n- Transparent land recovery process\n- Market-based compensation\n- Clear local government responsibilities',
                    analysis: 'This amendment has significant impact on the real estate market and investors. Ongoing projects should review legal procedures to align with new regulations.',
                    recommendation: 'Businesses should review existing land contracts and consult legal counsel. Projects in negotiation phase should delay signing until detailed guidance is issued.',
                },
                kr: {
                    title: '국회, 개정 토지법 통과',
                    summary: '2026년 개정 토지법이 대의원 92%의 찬성으로 국회를 통과했습니다. 이 법은 2026년 7월 1일부터 시행되며, 토지 회수, 보상, 재정착 및 공공 토지 관리에 중점을 둡니다.',
                    content: '오늘 오전 4월 15일 국회는 높은 승인율로 개정 토지법을 공식 통과시켰습니다. 새 법은 토지 사용권, 회수 절차 및 보상에 획기적인 변화를 가져옵니다...',
                    analysis: '이 개정안은 부동산 시장과 투자자에게 중요한 영향을 미칩니다. 진행 중인 프로젝트는 새 규정에 맞춰 법적 절차를 검토해야 합니다.',
                    recommendation: '기업은 기존 토지 계약을 검토하고 법률 자문을 받아야 합니다. 협상 단계의 프로젝트는 세부 지침이 발표될 때까지 서명을 연기해야 합니다.',
                },
            },
        },
        {
            id: 2, title: 'Chính phủ ban hành nghị định mới về thuế thu nhập doanh nghiệp',
            project_name: 'legal_task', source: 'Dân Trí', source_language: 'vi',
            topics: ['Tax Law', 'Regulation'],
            url: 'https://dantri.com.vn/xa-hoi/nghi-dinh-thue-tndn-20260415101500.htm',
            relevance_score: 85, is_relevant: true, published_at_vn: '15/04/2026 10:15 ICT',
            translations: {
                vi: {
                    title: 'Chính phủ ban hành nghị định mới về thuế thu nhập doanh nghiệp',
                    summary: 'Nghị định 45/2026/NĐ-CP quy định chi tiết về thuế suất TNDN, ưu đãi thuế cho doanh nghiệp vừa và nhỏ, và các quy định chống chuyển giá.',
                    content: 'Nghị định 45/2026/NĐ-CP có hiệu lực từ 01/05/2026 với những thay đổi chính về thuế thu nhập doanh nghiệp...',
                    analysis: 'Nghị định này giúp doanh nghiệp vừa và nhỏ tiếp cận ưu đãi thuế dễ dàng hơn, đồng thời siết chặt các quy định về chuyển giá.',
                    recommendation: 'Doanh nghiệp vừa và nhỏ nên đăng ký các chương trình ưu đãi. Doanh nghiệp có giao dịch liên kết cần rà soát lại cơ cấu giá.',
                },
                en: {
                    title: 'Government issues new decree on corporate income tax',
                    summary: 'Decree 45/2026/ND-CP provides detailed regulations on CIT rates, tax incentives for SMEs, and anti-transfer pricing rules.',
                    content: 'Decree 45/2026/ND-CP takes effect May 1, 2026 with key changes to corporate income tax...',
                    analysis: 'This decree makes tax incentives more accessible for SMEs while tightening transfer pricing regulations.',
                    recommendation: 'SMEs should register for incentive programs. Companies with related-party transactions should review pricing structures.',
                },
                kr: {
                    title: '정부, 법인세에 관한 새 법령 발표',
                    summary: '법령 45/2026/ND-CP는 법인세율, 중소기업 세제 혜택 및 이전가격 방지 규칙에 대한 세부 규정을 제공합니다.',
                    content: '법령 45/2026/ND-CP는 2026년 5월 1일부터 시행되며 법인세에 주요 변경 사항이 있습니다...',
                    analysis: '이 법령은 중소기업에 세제 혜택을 더 쉽게 제공하는 동시에 이전가격 규정을 강화합니다.',
                    recommendation: '중소기업은 혜택 프로그램에 등록해야 합니다. 관계사 거래가 있는 회사는 가격 구조를 검토해야 합니다.',
                },
            },
        },
        {
            id: 3, title: 'Giá vàng tăng mạnh',
            project_name: 'legal_task', source: 'Thanh Niên', source_language: 'vi',
            topics: ['Finance'],
            url: 'https://thanhnien.vn/gia-vang-tang-185260415110000000.htm',
            relevance_score: 20, is_relevant: false, published_at_vn: '15/04/2026 11:00 ICT',
        },
        {
            id: 4, title: 'Cháy lớn tại khu công nghiệp Tân Bình',
            project_name: 'er_task', source: 'VnExpress', source_language: 'vi',
            topics: ['Fire', 'Emergency'],
            url: 'https://vnexpress.net/chay-khu-cong-nghiep-tan-binh-4567890.html',
            relevance_score: 95, is_relevant: true, published_at_vn: '15/04/2026 13:45 ICT',
            translations: {
                vi: {
                    title: 'Cháy lớn tại khu công nghiệp Tân Bình',
                    summary: 'Vụ cháy xảy ra tại nhà máy sản xuất trong khu công nghiệp Tân Bình lúc 13:00. Lực lượng chức năng đã huy động 15 xe cứu hỏa đến hiện trường.',
                    content: 'Trưa nay 15/4, một vụ cháy lớn đã xảy ra tại khu công nghiệp Tân Bình, TP.HCM. Đám cháy bắt nguồn từ nhà xưởng sản xuất hóa chất...',
                    analysis: 'Đây là vụ cháy có quy mô lớn, ảnh hưởng đến nhiều doanh nghiệp lân cận và gây tắc nghẽn giao thông nghiêm trọng.',
                    recommendation: 'Doanh nghiệp gần khu vực cần sơ tán nhân viên ngay lập tức. Kiểm tra lại hệ thống PCCC của nhà máy.',
                },
                en: {
                    title: 'Major fire at Tan Binh Industrial Zone',
                    summary: 'Fire broke out at a manufacturing plant in Tan Binh Industrial Zone at 1:00 PM. Authorities deployed 15 fire trucks to the scene.',
                    content: 'This afternoon, April 15, a major fire broke out at Tan Binh Industrial Zone, Ho Chi Minh City. The fire originated from a chemical production facility...',
                    analysis: 'This is a large-scale fire affecting nearby businesses and causing severe traffic congestion.',
                    recommendation: 'Nearby businesses should evacuate employees immediately. Review fire safety systems.',
                },
                kr: {
                    title: '탄빈 산업단지 대형 화재',
                    summary: '오후 1시에 탄빈 산업단지의 제조 공장에서 화재가 발생했습니다. 당국은 현장에 15대의 소방차를 배치했습니다.',
                    content: '오늘 오후 4월 15일 호치민시 탄빈 산업단지에서 대형 화재가 발생했습니다. 화재는 화학 생산 시설에서 시작되었습니다...',
                    analysis: '이것은 인근 기업에 영향을 미치고 심각한 교통 체증을 일으키는 대규모 화재입니다.',
                    recommendation: '근처 기업은 즉시 직원을 대피시켜야 합니다. 소방 시스템을 검토하십시오.',
                },
            },
        },
        {
            id: 5, title: 'Dự báo thời tiết tuần tới',
            project_name: 'er_task', source: 'VnExpress', source_language: 'vi',
            topics: ['Weather'],
            url: 'https://vnexpress.net/du-bao-thoi-tiet-4567891.html',
            relevance_score: 30, is_relevant: false, published_at_vn: '15/04/2026 14:00 ICT',
        },
        {
            id: 6, title: 'Bộ Tư pháp công bố quy định mới về giao dịch điện tử',
            project_name: 'legal_task', source: 'Dân Trí', source_language: 'vi',
            topics: ['Digital Law', 'Compliance'],
            url: 'https://dantri.com.vn/giao-dich-dien-tu-20260415153000.htm',
            relevance_score: 88, is_relevant: true, published_at_vn: '15/04/2026 15:30 ICT',
            translations: {
                vi: {
                    title: 'Bộ Tư pháp công bố quy định mới về giao dịch điện tử',
                    summary: 'Thông tư 12/2026/TT-BTP hướng dẫn cụ thể về chữ ký điện tử, hợp đồng điện tử và lưu trữ dữ liệu giao dịch trong môi trường số.',
                    content: 'Thông tư mới của Bộ Tư pháp có hiệu lực từ 01/06/2026, thay thế các quy định cũ về giao dịch điện tử...',
                    analysis: 'Thông tư này tạo hành lang pháp lý rõ ràng cho các nền tảng thương mại điện tử và fintech.',
                    recommendation: 'Doanh nghiệp công nghệ và tài chính cần rà soát hệ thống chữ ký điện tử và lưu trữ dữ liệu.',
                },
                en: {
                    title: 'Ministry of Justice announces new e-transaction rules',
                    summary: 'Circular 12/2026/TT-BTP provides specific guidance on electronic signatures, electronic contracts, and transaction data storage.',
                    content: 'The new Ministry of Justice circular takes effect June 1, 2026, replacing old e-transaction regulations...',
                    analysis: 'This circular creates a clear legal framework for e-commerce and fintech platforms.',
                    recommendation: 'Tech and financial companies should review e-signature systems and data storage.',
                },
                kr: {
                    title: '법무부, 전자거래에 관한 새 규정 발표',
                    summary: '회람 12/2026/TT-BTP는 전자 서명, 전자 계약 및 거래 데이터 저장에 대한 구체적인 지침을 제공합니다.',
                    content: '새 법무부 회람은 2026년 6월 1일부터 시행되어 기존 전자거래 규정을 대체합니다...',
                    analysis: '이 회람은 전자 상거래 및 핀테크 플랫폼에 명확한 법적 프레임워크를 제공합니다.',
                    recommendation: '기술 및 금융 회사는 전자 서명 시스템 및 데이터 저장을 검토해야 합니다.',
                },
            },
        },
        // Additional mock articles for pagination testing
        ...(() => {
            const today = new Date();
            const fmtVn = (d) => {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yy = d.getFullYear();
                const hh = String(d.getHours()).padStart(2, '0');
                const mn = String(d.getMinutes()).padStart(2, '0');
                return `${dd}/${mm}/${yy} ${hh}:${mn} ICT`;
            };
            const samples = [
                { title: 'Bộ Công an siết chặt quản lý thông tin cá nhân', topics: ['Privacy', 'Compliance'], source: 'Thanh Niên', score: 78 },
                { title: 'Nghị quyết mới về đầu tư nước ngoài', topics: ['Investment', 'Policy'], source: 'Dân Trí', score: 82 },
                { title: 'Tòa án nhân dân tối cao hướng dẫn xét xử', topics: ['Court', 'Compliance'], source: 'VnExpress', score: 91 },
                { title: 'Doanh nghiệp phản đối mức phạt mới', topics: ['Regulation', 'Business'], source: 'Thanh Niên', score: 65 },
                { title: 'Quy định mới về bảo vệ người tiêu dùng', topics: ['Consumer', 'Compliance'], source: 'Dân Trí', score: 73 },
                { title: 'Thủ tướng chỉ đạo rà soát thủ tục hành chính', topics: ['Policy', 'Governance'], source: 'VnExpress', score: 68 },
                { title: 'Sửa đổi Luật Lao động 2026 được đề xuất', topics: ['Labor Law', 'Policy'], source: 'Thanh Niên', score: 87 },
                { title: 'Ngân hàng Nhà nước công bố quy định mới về tín dụng', topics: ['Banking', 'Regulation'], source: 'Dân Trí', score: 79 },
                { title: 'Bộ Y tế ban hành hướng dẫn về an toàn thực phẩm', topics: ['Health', 'Compliance'], source: 'VnExpress', score: 72 },
                { title: 'Chính phủ phê duyệt đề án chuyển đổi số giai đoạn 2026-2030', topics: ['Digital Law', 'Policy'], source: 'Thanh Niên', score: 84 },
                { title: 'Vụ tranh chấp đất đai được giải quyết dứt điểm', topics: ['Land Law', 'Court'], source: 'Dân Trí', score: 66 },
                { title: 'Quy định xử phạt vi phạm giao thông mới', topics: ['Traffic', 'Regulation'], source: 'VnExpress', score: 55 },
            ];
            return samples.map((s, i) => {
                const d = new Date(today);
                d.setDate(d.getDate() - (i % 7));
                d.setHours(8 + (i % 12), (i * 7) % 60);
                return {
                    id: 100 + i,
                    title: s.title,
                    project_name: 'legal_task',
                    source: s.source,
                    source_language: 'vi',
                    topics: s.topics,
                    relevance_score: s.score,
                    is_relevant: s.score >= 70,
                    published_at_vn: fmtVn(d),
                };
            });
        })(),
    ],
};
