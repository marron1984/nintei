/**
 * 書類生成サービス
 * テンプレートからPDF/Excel出力、不備チェック、版管理
 */

import type { PrismaClient, DocumentTemplate, DocumentInstance } from '@prisma/client';
import { ApplicationError } from '@nintei/shared';
import Mustache from 'mustache';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface GenerateDocumentInput {
  tenantId: string;
  templateId: string;
  foreignWorkerId?: string;
  companyId?: string;
  title: string;
  language: string;
  variables: Record<string, unknown>;
  createdById: string;
}

export interface GenerateDocumentResult {
  document: DocumentInstance;
  validationErrors: ValidationError[];
  canGenerate: boolean;
}

export class DocumentGeneratorService {
  constructor(private prisma: PrismaClient) {}

  /**
   * テンプレートの必須項目をチェック
   */
  validateRequiredFields(
    template: DocumentTemplate,
    variables: Record<string, unknown>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const requiredFields = (template.requiredFields as string[]) || [];

    for (const field of requiredFields) {
      const value = this.getNestedValue(variables, field);
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          message: `必須項目「${field}」が入力されていません`,
          severity: 'error',
        });
      }
    }

    return errors;
  }

  /**
   * ネストされた値を取得
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object'
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj as unknown);
  }

  /**
   * テンプレートをレンダリング
   */
  renderTemplate(template: string, variables: Record<string, unknown>): string {
    try {
      return Mustache.render(template, variables);
    } catch (error) {
      throw new ApplicationError(
        'BUSINESS_INVALID_STATE',
        'Failed to render template: ' + (error as Error).message
      );
    }
  }

  /**
   * 書類インスタンスを作成
   */
  async createDocumentInstance(input: GenerateDocumentInput): Promise<GenerateDocumentResult> {
    const {
      tenantId,
      templateId,
      foreignWorkerId,
      companyId,
      title,
      language,
      variables,
      createdById,
    } = input;

    // テンプレートを取得
    const template = await this.prisma.documentTemplate.findFirst({
      where: { id: templateId, tenantId, status: 'active' },
    });

    if (!template) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Template not found or not active');
    }

    // 必須項目チェック
    const validationErrors = this.validateRequiredFields(template, variables);
    const hasErrors = validationErrors.some((e) => e.severity === 'error');
    const canGenerate = !hasErrors;

    // 書類インスタンスを作成
    const document = await this.prisma.documentInstance.create({
      data: {
        tenantId,
        templateId,
        foreignWorkerId,
        companyId,
        title,
        language,
        variables,
        validationStatus: hasErrors ? 'invalid' : 'valid',
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        status: 'draft',
        createdById,
      },
    });

    return {
      document,
      validationErrors,
      canGenerate,
    };
  }

  /**
   * PDFを生成
   */
  async generatePdf(
    documentId: string,
    tenantId: string
  ): Promise<{ fileUrl: string; document: DocumentInstance }> {
    const document = await this.prisma.documentInstance.findFirst({
      where: { id: documentId, tenantId },
      include: { template: true, foreignWorker: true },
    });

    if (!document) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Document not found');
    }

    // 不備がある場合はブロック（設定による）
    if (document.validationStatus === 'invalid') {
      const errors = document.validationErrors as ValidationError[] | null;
      const hasBlockingErrors = errors?.some((e) => e.severity === 'error');
      if (hasBlockingErrors) {
        throw new ApplicationError(
          'BUSINESS_DOCUMENT_VALIDATION_FAILED',
          'Cannot generate document: required fields are missing'
        );
      }
    }

    // テンプレートをレンダリング
    const variables = document.variables as Record<string, unknown>;
    let content = document.template.content;

    // 言語別コンテンツがあれば使用
    const contentTranslations = document.template.contentTranslations as Record<string, string> | null;
    if (contentTranslations && contentTranslations[document.language]) {
      content = contentTranslations[document.language];
    }

    const renderedContent = this.renderTemplate(content, variables);

    // PDF生成（実際の実装ではpuppeteerやpdfkitを使用）
    // ここではモックとしてファイルURLを返す
    const fileUrl = await this.convertHtmlToPdf(renderedContent, document.id);

    // 書類を更新
    const updatedDocument = await this.prisma.documentInstance.update({
      where: { id: documentId },
      data: {
        generatedFileUrl: fileUrl,
        generatedAt: new Date(),
      },
    });

    // バージョンを記録
    await this.prisma.documentVersion.create({
      data: {
        documentId,
        version: document.version,
        versionType: document.versionType,
        fileUrl,
        createdById: tenantId, // Should be userId in real implementation
      },
    });

    return { fileUrl, document: updatedDocument };
  }

  /**
   * HTMLをPDFに変換（実際の実装）
   */
  private async convertHtmlToPdf(html: string, documentId: string): Promise<string> {
    // 実際の実装ではpuppeteerやpdfkitを使用
    // S3にアップロードしてURLを返す

    // モック実装
    const filename = `documents/${documentId}/${Date.now()}.pdf`;
    // const s3Url = await uploadToS3(pdfBuffer, filename);

    return `https://storage.example.com/${filename}`;
  }

  /**
   * 書類の新バージョンを作成（差戻し後の再提出など）
   */
  async createNewVersion(
    documentId: string,
    tenantId: string,
    versionType: 'revision' | 'resubmission',
    variables?: Record<string, unknown>,
    createdById?: string
  ): Promise<DocumentInstance> {
    const originalDocument = await this.prisma.documentInstance.findFirst({
      where: { id: documentId, tenantId },
      include: { template: true },
    });

    if (!originalDocument) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Document not found');
    }

    const newVariables = variables || (originalDocument.variables as Record<string, unknown>);

    // 必須項目チェック
    const validationErrors = this.validateRequiredFields(
      originalDocument.template,
      newVariables
    );
    const hasErrors = validationErrors.some((e) => e.severity === 'error');

    // 新バージョンを作成
    const newDocument = await this.prisma.documentInstance.create({
      data: {
        tenantId,
        templateId: originalDocument.templateId,
        foreignWorkerId: originalDocument.foreignWorkerId,
        companyId: originalDocument.companyId,
        title: originalDocument.title,
        language: originalDocument.language,
        variables: newVariables,
        version: originalDocument.version + 1,
        versionType,
        parentVersionId: documentId,
        validationStatus: hasErrors ? 'invalid' : 'valid',
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        status: 'draft',
        createdById: createdById || originalDocument.createdById,
      },
    });

    return newDocument;
  }

  /**
   * 書類を承認申請
   */
  async submitForApproval(documentId: string, tenantId: string): Promise<DocumentInstance> {
    const document = await this.prisma.documentInstance.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Document not found');
    }

    if (document.status !== 'draft') {
      throw new ApplicationError('BUSINESS_INVALID_STATE', 'Only draft documents can be submitted');
    }

    if (document.validationStatus === 'invalid') {
      throw new ApplicationError(
        'BUSINESS_DOCUMENT_VALIDATION_FAILED',
        'Cannot submit: document has validation errors'
      );
    }

    if (!document.generatedFileUrl) {
      throw new ApplicationError(
        'BUSINESS_INVALID_STATE',
        'Cannot submit: document has not been generated'
      );
    }

    const updated = await this.prisma.documentInstance.update({
      where: { id: documentId },
      data: { status: 'pending_approval' },
    });

    return updated;
  }

  /**
   * 書類を承認（入力と承認の分離）
   */
  async approveDocument(
    documentId: string,
    tenantId: string,
    approverId: string
  ): Promise<DocumentInstance> {
    const document = await this.prisma.documentInstance.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Document not found');
    }

    if (document.status !== 'pending_approval') {
      throw new ApplicationError('BUSINESS_INVALID_STATE', 'Document is not pending approval');
    }

    // 入力と承認の分離
    if (document.createdById === approverId) {
      throw new ApplicationError(
        'AUTH_PERMISSION_DENIED',
        'Cannot approve your own document (separation of duties)'
      );
    }

    const updated = await this.prisma.documentInstance.update({
      where: { id: documentId },
      data: {
        status: 'approved',
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * 書類を差戻し
   */
  async returnDocument(
    documentId: string,
    tenantId: string,
    reason: string
  ): Promise<DocumentInstance> {
    const document = await this.prisma.documentInstance.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Document not found');
    }

    if (!['pending_approval', 'submitted'].includes(document.status)) {
      throw new ApplicationError('BUSINESS_INVALID_STATE', 'Document cannot be returned');
    }

    const updated = await this.prisma.documentInstance.update({
      where: { id: documentId },
      data: {
        status: 'returned',
        versionType: 'returned',
      },
    });

    return updated;
  }
}

export default DocumentGeneratorService;
