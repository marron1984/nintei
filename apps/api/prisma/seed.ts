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

  // Create branch
  const branch = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'HQ' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '本社',
      code: 'HQ',
      prefecture: '東京都',
      city: '港区',
      street: '芝公園1-1-1',
      isHeadquarters: true,
      status: 'active',
    },
  });

  console.log(`✅ Created branch: ${branch.name}`);

  // Create team
  const team = await prisma.team.upsert({
    where: { branchId_code: { branchId: branch.id, code: 'SUPPORT' } },
    update: {},
    create: {
      branchId: branch.id,
      name: '支援チーム',
      code: 'SUPPORT',
      status: 'active',
    },
  });

  console.log(`✅ Created team: ${team.name}`);

  // Create admin user
  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      email: 'admin@example.com',
      passwordHash,
      name: '管理者 太郎',
      nameKana: 'カンリシャ タロウ',
      role: 'tenant_admin',
      status: 'active',
      preferredLanguage: 'ja',
      timezone: 'Asia/Tokyo',
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // Create support staff
  const staff = await prisma.user.upsert({
    where: { email: 'staff@example.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      teamId: team.id,
      email: 'staff@example.com',
      passwordHash,
      name: '支援 花子',
      nameKana: 'シエン ハナコ',
      role: 'support_staff',
      status: 'active',
      preferredLanguage: 'ja',
      timezone: 'Asia/Tokyo',
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

  // Create sample worker
  const worker = await prisma.worker.create({
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
      residenceStatus: 'specified_skilled_1',
      residencePeriod: '1年',
      residenceExpiry: new Date('2025-12-31'),
      residenceIssueDate: new Date('2024-01-01'),
      contractStartDate: new Date('2024-01-15'),
      jobCategory: '製造業',
      occupation: '機械加工',
      salary: 200000,
      salaryType: 'monthly',
      workingHoursPerWeek: 40,
      status: 'active',
      supportStartDate: new Date('2024-01-15'),
    },
  });

  console.log(`✅ Created worker: ${worker.lastName} ${worker.firstName}`);

  // Create support plan template
  const template = await prisma.supportPlanTemplate.create({
    data: {
      tenantId: tenant.id,
      name: '標準支援計画テンプレート',
      description: '特定技能1号向け標準支援計画',
      isDefault: true,
      status: 'active',
      items: {
        create: [
          {
            itemNumber: 1,
            category: 'pre_entry',
            title: '事前ガイダンス',
            titleTranslations: { en: 'Pre-entry Guidance', vi: 'Hướng dẫn trước khi nhập cảnh' },
            description: '入国前に必要な情報を提供',
            descriptionTranslations: {},
            requiresConsent: true,
            frequency: 'once',
          },
          {
            itemNumber: 2,
            category: 'arrival',
            title: '出入国時の送迎',
            titleTranslations: { en: 'Airport Pickup/Dropoff', vi: 'Đón/tiễn tại sân bay' },
            description: '空港等への送迎を実施',
            descriptionTranslations: {},
            frequency: 'once',
          },
          {
            itemNumber: 3,
            category: 'living',
            title: '住居確保・生活必需品',
            titleTranslations: { en: 'Housing and Necessities', vi: 'Nhà ở và đồ dùng thiết yếu' },
            description: '住居の確保と生活に必要な物品の準備を支援',
            descriptionTranslations: {},
            frequency: 'once',
          },
          {
            itemNumber: 4,
            category: 'living',
            title: '生活オリエンテーション',
            titleTranslations: { en: 'Life Orientation', vi: 'Hướng dẫn cuộc sống' },
            description: '日本での生活に必要な情報を提供',
            descriptionTranslations: {},
            requiresConsent: true,
            frequency: 'once',
          },
          {
            itemNumber: 5,
            category: 'living',
            title: '公的手続への同行',
            titleTranslations: { en: 'Official Procedures Assistance', vi: 'Hỗ trợ thủ tục hành chính' },
            description: '市区町村等への届出に同行',
            descriptionTranslations: {},
            frequency: 'as_needed',
          },
          {
            itemNumber: 6,
            category: 'japanese_learning',
            title: '日本語学習機会の提供',
            titleTranslations: { en: 'Japanese Language Learning', vi: 'Học tiếng Nhật' },
            description: '日本語学習の機会を提供',
            descriptionTranslations: {},
            frequency: 'as_needed',
          },
          {
            itemNumber: 7,
            category: 'consultation',
            title: '相談・苦情対応',
            titleTranslations: { en: 'Consultation and Complaints', vi: 'Tư vấn và giải quyết khiếu nại' },
            description: '相談・苦情に対応',
            descriptionTranslations: {},
            frequency: 'as_needed',
          },
          {
            itemNumber: 8,
            category: 'community',
            title: '日本人との交流促進',
            titleTranslations: { en: 'Community Integration', vi: 'Hội nhập cộng đồng' },
            description: '地域住民との交流機会を提供',
            descriptionTranslations: {},
            frequency: 'quarterly',
          },
          {
            itemNumber: 9,
            category: 'career',
            title: '転職支援',
            titleTranslations: { en: 'Job Change Support', vi: 'Hỗ trợ đổi việc' },
            description: '会社都合離職の場合の転職支援',
            descriptionTranslations: {},
            frequency: 'as_needed',
          },
          {
            itemNumber: 10,
            category: 'regular_interview',
            title: '定期面談',
            titleTranslations: { en: 'Regular Interviews', vi: 'Phỏng vấn định kỳ' },
            description: '3か月に1回以上の定期面談を実施',
            descriptionTranslations: {},
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
      type: 'pdf',
      content: '<h1>支援計画書</h1><p>{{workerName}}様</p>',
      contentTranslations: {
        en: '<h1>Support Plan</h1><p>Dear {{workerName}}</p>',
        vi: '<h1>Kế hoạch hỗ trợ</h1><p>Kính gửi {{workerName}}</p>',
      },
      variables: [
        { key: 'workerName', label: '外国人氏名', type: 'text', required: true, source: 'worker' },
        { key: 'companyName', label: '受入企業名', type: 'text', required: true, source: 'company' },
        { key: 'startDate', label: '支援開始日', type: 'date', required: true, source: 'custom' },
      ],
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
