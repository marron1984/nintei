import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { registrationNumber: 'RSO-2024-0001' },
    update: {},
    create: {
      name: 'サンプル登録支援機関',
      registrationNumber: 'RSO-2024-0001',
      status: 'active',
      timezone: 'Asia/Tokyo',
      defaultLanguage: 'ja',
    },
  });

  console.log(`✅ Created tenant: ${tenant.name}`);

  // Create organization units (hierarchical)
  const headquarters = await prisma.orgUnit.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'HQ' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '本社',
      code: 'HQ',
      type: 'branch',
      level: 0,
      prefecture: '東京都',
      city: '港区',
      street: '芝公園1-1-1',
      status: 'active',
    },
  });

  console.log(`✅ Created org unit: ${headquarters.name}`);

  const supportTeam = await prisma.orgUnit.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SUPPORT' } },
    update: {},
    create: {
      tenantId: tenant.id,
      parentId: headquarters.id,
      name: '支援チーム',
      code: 'SUPPORT',
      type: 'team',
      level: 1,
      status: 'active',
    },
  });

  console.log(`✅ Created org unit: ${supportTeam.name}`);

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'RSO_ADMIN' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '管理者',
      code: 'RSO_ADMIN',
      description: '登録支援機関の管理者',
      permissions: [
        'tenant:*', 'user:*', 'org_unit:*', 'company:*', 'foreign_worker:*',
        'support_plan:*', 'interview:*', 'consultation:*', 'document:*', 'audit:read',
      ],
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'RSO_MANAGER' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '支援責任者',
      code: 'RSO_MANAGER',
      description: '支援責任者（承認権限あり）',
      permissions: [
        'user:read', 'company:*', 'foreign_worker:*',
        'support_plan:*', 'interview:*', 'consultation:*', 'document:*', 'audit:read',
      ],
      isSystem: true,
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'RSO_STAFF' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '支援担当者',
      code: 'RSO_STAFF',
      description: '支援担当者',
      permissions: [
        'company:read', 'foreign_worker:read', 'foreign_worker:update',
        'support_plan:read', 'support_plan:create', 'support_plan:update',
        'interview:*', 'consultation:*', 'document:read', 'document:create',
      ],
      isSystem: true,
    },
  });

  const auditorRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'RSO_AUDITOR' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '監査閲覧',
      code: 'RSO_AUDITOR',
      description: '監査ログ閲覧専用',
      permissions: [
        'audit:read', 'company:read', 'foreign_worker:read',
        'support_plan:read', 'interview:read', 'consultation:read', 'document:read',
      ],
      isSystem: true,
    },
  });

  const companyAdminRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'COMPANY_ADMIN' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '受入企業管理者',
      code: 'COMPANY_ADMIN',
      description: '受入企業の管理者',
      permissions: [
        'company:read:own', 'foreign_worker:read:own', 'foreign_worker:update:own',
        'support_plan:read:own', 'interview:read:own', 'document:read:own',
      ],
      isSystem: true,
    },
  });

  const companyHrRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'COMPANY_HR' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '受入企業人事',
      code: 'COMPANY_HR',
      description: '受入企業の人事担当者',
      permissions: [
        'company:read:own', 'foreign_worker:read:own',
        'support_plan:read:own', 'interview:read:own', 'document:read:own',
      ],
      isSystem: true,
    },
  });

  const legalStaffRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'LEGAL_STAFF' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '士業実務',
      code: 'LEGAL_STAFF',
      description: '士業の実務担当者',
      permissions: [
        'company:read', 'foreign_worker:read',
        'support_plan:read', 'document:*',
      ],
      isSystem: true,
    },
  });

  const legalViewerRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'LEGAL_VIEWER' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '士業閲覧',
      code: 'LEGAL_VIEWER',
      description: '士業の閲覧専用',
      permissions: [
        'company:read', 'foreign_worker:read', 'support_plan:read', 'document:read',
      ],
      isSystem: true,
    },
  });

  console.log('✅ Created system roles');

  // Create admin user
  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@example.com',
      passwordHash,
      name: '管理者 太郎',
      nameKana: 'カンリシャ タロウ',
      status: 'active',
      preferredLanguage: 'ja',
      timezone: 'Asia/Tokyo',
    },
  });

  // Create membership for admin
  await prisma.membership.upsert({
    where: {
      userId_orgUnitId_roleId: {
        userId: admin.id,
        orgUnitId: headquarters.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      orgUnitId: headquarters.id,
      roleId: adminRole.id,
      isPrimary: true,
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // Create support staff
  const staff = await prisma.user.upsert({
    where: { email: 'staff@example.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'staff@example.com',
      passwordHash,
      name: '支援 花子',
      nameKana: 'シエン ハナコ',
      status: 'active',
      preferredLanguage: 'ja',
      timezone: 'Asia/Tokyo',
    },
  });

  // Create membership for staff
  await prisma.membership.upsert({
    where: {
      userId_orgUnitId_roleId: {
        userId: staff.id,
        orgUnitId: supportTeam.id,
        roleId: staffRole.id,
      },
    },
    update: {},
    create: {
      userId: staff.id,
      orgUnitId: supportTeam.id,
      roleId: staffRole.id,
      isPrimary: true,
    },
  });

  console.log(`✅ Created staff user: ${staff.email}`);

  // Create company
  const company = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: 'サンプル株式会社',
      nameKana: 'サンプルカブシキガイシャ',
      corporateNumber: '1234567890123',
      industry: '製造業',
      status: 'active',
      contractStartDate: new Date('2024-01-01'),
      offices: {
        create: {
          name: '本社工場',
          isHeadquarters: true,
          prefecture: '愛知県',
          city: '名古屋市',
          street: '中区1-1-1',
          phone: '052-123-4567',
          status: 'active',
        },
      },
    },
  });

  console.log(`✅ Created company: ${company.name}`);

  // Get office
  const office = await prisma.companyOffice.findFirst({
    where: { companyId: company.id },
  });

  // Create sample foreign worker
  const foreignWorker = await prisma.foreignWorker.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      officeId: office!.id,
      firstName: 'Nguyen',
      lastName: 'Van A',
      firstNameKana: 'グエン',
      lastNameKana: 'ヴァン ア',
      firstNameNative: 'Nguyễn',
      lastNameNative: 'Văn A',
      dateOfBirth: new Date('1995-05-15'),
      gender: 'male',
      nationality: 'VN',
      phone: '080-1234-5678',
      nativeLanguage: 'vi',
      understandsLanguages: ['vi', 'en', 'ja'],
      japaneseLevel: 'N3',
      residenceCardNumber: 'AB12345678CD',
      residenceStatus: '特定技能1号',
      residencePeriod: '1年',
      residenceExpiry: new Date('2025-12-31'),
      residenceIssueDate: new Date('2024-01-01'),
      status: 'active',
      supportStartDate: new Date('2024-01-15'),
    },
  });

  console.log(`✅ Created foreign worker: ${foreignWorker.lastName} ${foreignWorker.firstName}`);

  // Create employment contract
  await prisma.employmentContract.create({
    data: {
      foreignWorkerId: foreignWorker.id,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2025-01-14'),
      jobCategory: '製造業',
      occupation: '機械加工',
      salary: 200000,
      salaryType: 'monthly',
      workingHoursPerWeek: 40,
      status: 'active',
    },
  });

  console.log('✅ Created employment contract');

  // Create support plan template with 10 support items (支援10項目)
  const template = await prisma.supportPlanTemplate.create({
    data: {
      tenantId: tenant.id,
      name: '標準支援計画テンプレート',
      description: '特定技能1号向け標準支援計画',
      language: 'ja',
      isDefault: true,
      isActive: true,
      status: 'active',
      items: {
        create: [
          {
            itemNumber: 1,
            type: 'pre_entry_guidance',
            title: '事前ガイダンス',
            titleTranslations: { en: 'Pre-entry Guidance', vi: 'Hướng dẫn trước khi nhập cảnh' },
            description: '入国前に必要な情報を提供（労働条件、活動内容、入国手続等）',
            descriptionTranslations: {},
            defaultDueDays: -7, // 入国7日前
            requiresConsent: true,
            frequency: 'once',
          },
          {
            itemNumber: 2,
            type: 'airport_pickup',
            title: '出入国時の送迎',
            titleTranslations: { en: 'Airport Pickup/Dropoff', vi: 'Đón/tiễn tại sân bay' },
            description: '空港等と事業所または住居への送迎を実施',
            descriptionTranslations: {},
            defaultDueDays: 0, // 入国日
            frequency: 'once',
          },
          {
            itemNumber: 3,
            type: 'housing_support',
            title: '住居確保・生活に必要な契約支援',
            titleTranslations: { en: 'Housing and Contract Support', vi: 'Hỗ trợ nhà ở và hợp đồng' },
            description: '住居の確保、銀行口座開設、携帯電話契約等の支援',
            descriptionTranslations: {},
            defaultDueDays: 7, // 入国後7日以内
            frequency: 'once',
          },
          {
            itemNumber: 4,
            type: 'life_orientation',
            title: '生活オリエンテーション',
            titleTranslations: { en: 'Life Orientation', vi: 'Hướng dẫn cuộc sống' },
            description: '日本での生活ルール、交通ルール、ゴミ出し等の説明',
            descriptionTranslations: {},
            defaultDueDays: 14, // 入国後2週間以内
            requiresConsent: true,
            frequency: 'once',
          },
          {
            itemNumber: 5,
            type: 'official_procedures',
            title: '公的手続等への同行',
            titleTranslations: { en: 'Official Procedures Support', vi: 'Hỗ trợ thủ tục hành chính' },
            description: '住民登録、社会保険、税金等の届出への同行',
            descriptionTranslations: {},
            defaultDueDays: 14, // 入国後2週間以内
            frequency: 'as_needed',
          },
          {
            itemNumber: 6,
            type: 'japanese_learning',
            title: '日本語学習の機会の提供',
            titleTranslations: { en: 'Japanese Language Learning', vi: 'Học tiếng Nhật' },
            description: '日本語教室や学習教材の情報提供',
            descriptionTranslations: {},
            defaultDueDays: 30, // 入国後1ヶ月以内
            frequency: 'as_needed',
          },
          {
            itemNumber: 7,
            type: 'consultation_complaints',
            title: '相談・苦情への対応',
            titleTranslations: { en: 'Consultation and Complaints', vi: 'Tư vấn và giải quyết khiếu nại' },
            description: '相談窓口の案内と適切な対応体制の確保',
            descriptionTranslations: {},
            defaultDueDays: 7, // 入国後7日以内に案内
            frequency: 'as_needed',
          },
          {
            itemNumber: 8,
            type: 'japanese_community',
            title: '日本人との交流促進',
            titleTranslations: { en: 'Community Integration', vi: 'Hội nhập cộng đồng' },
            description: '地域の行事、ボランティア活動等への参加機会の提供',
            descriptionTranslations: {},
            defaultDueDays: 90, // 入国後3ヶ月以内
            frequency: 'quarterly',
          },
          {
            itemNumber: 9,
            type: 'job_change_support',
            title: '転職支援（人員整理等の場合）',
            titleTranslations: { en: 'Job Change Support', vi: 'Hỗ trợ đổi việc' },
            description: '非自発的離職の場合の転職支援、推薦状作成等',
            descriptionTranslations: {},
            defaultDueDays: null, // 発生時
            frequency: 'as_needed',
          },
          {
            itemNumber: 10,
            type: 'regular_interviews',
            title: '定期的な面談の実施',
            titleTranslations: { en: 'Regular Interviews', vi: 'Phỏng vấn định kỳ' },
            description: '3か月に1回以上の定期面談、監督者との面談',
            descriptionTranslations: {},
            defaultDueDays: 90, // 初回は入国後3ヶ月
            frequency: 'quarterly',
          },
        ],
      },
    },
  });

  console.log(`✅ Created support plan template: ${template.name}`);

  // Create document template
  const docTemplate = await prisma.documentTemplate.create({
    data: {
      tenantId: tenant.id,
      name: '支援計画書',
      description: '特定技能1号支援計画書テンプレート',
      category: 'support_plan',
      format: 'html',
      content: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>支援計画書</title></head>
<body>
<h1>1号特定技能外国人支援計画書</h1>
<p>対象者: {{workerName}}</p>
<p>受入企業: {{companyName}}</p>
<p>支援開始日: {{startDate}}</p>
<h2>支援内容</h2>
{{#items}}
<h3>{{itemNumber}}. {{title}}</h3>
<p>{{description}}</p>
{{/items}}
</body>
</html>`,
      contentTranslations: {
        en: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Support Plan</title></head>
<body>
<h1>Support Plan for Specified Skilled Worker (i)</h1>
<p>Name: {{workerName}}</p>
<p>Company: {{companyName}}</p>
<p>Start Date: {{startDate}}</p>
<h2>Support Items</h2>
{{#items}}
<h3>{{itemNumber}}. {{title}}</h3>
<p>{{description}}</p>
{{/items}}
</body>
</html>`,
        vi: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Kế hoạch hỗ trợ</title></head>
<body>
<h1>Kế hoạch hỗ trợ lao động kỹ năng đặc định loại 1</h1>
<p>Họ tên: {{workerName}}</p>
<p>Công ty: {{companyName}}</p>
<p>Ngày bắt đầu: {{startDate}}</p>
<h2>Nội dung hỗ trợ</h2>
{{#items}}
<h3>{{itemNumber}}. {{title}}</h3>
<p>{{description}}</p>
{{/items}}
</body>
</html>`,
      },
      variables: [
        { key: 'workerName', label: '外国人氏名', type: 'text', required: true },
        { key: 'companyName', label: '受入企業名', type: 'text', required: true },
        { key: 'startDate', label: '支援開始日', type: 'date', required: true },
        { key: 'items', label: '支援項目', type: 'array', required: true },
      ],
      requiredFields: ['workerName', 'companyName', 'startDate'],
      status: 'active',
      isLegalDocument: true,
      createdById: admin.id,
    },
  });

  console.log(`✅ Created document template: ${docTemplate.name}`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nTest credentials:');
  console.log('  Admin: admin@example.com / password123');
  console.log('  Staff: staff@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
