package services

import (
	"strings"
	"testing"

	"rag-agent-server/internal/models"
)

func TestValidateVariantCreateRequest(t *testing.T) {
	t.Parallel()

	price := 100.0
	sale := 80.0
	req := models.VariantCreateRequest{
		SKU:        " sku-1 ",
		Attributes: map[string]string{"size": "L"},
		Price:      &price,
		SalePrice:  &sale,
		Stock:      5,
	}

	got, err := validateVariantCreateRequest(req, 120)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.SKU != "sku-1" {
		t.Fatalf("sku = %q, want sku-1", got.SKU)
	}

	badStock := req
	badStock.Stock = -1
	if _, err := validateVariantCreateRequest(badStock, 120); err == nil {
		t.Fatalf("expected stock validation error")
	}

	badAttrs := req
	badAttrs.Attributes = nil
	if _, err := validateVariantCreateRequest(badAttrs, 120); err == nil {
		t.Fatalf("expected attributes validation error")
	}

	tooHighSale := req
	high := 130.0
	tooHighSale.SalePrice = &high
	if _, err := validateVariantCreateRequest(tooHighSale, 120); err == nil {
		t.Fatalf("expected sale price validation error")
	}
}

func TestResolveUpdatedProductPrices(t *testing.T) {
	t.Parallel()

	currentSale := 90.0
	currentSalePtr := &currentSale

	newBase := 80.0
	newSale := 70.0
	nextBase, nextSale, err := resolveUpdatedProductPrices(100, currentSalePtr, models.ProductUpdateRequest{
		BasePrice: &newBase,
		SalePrice: &newSale,
	})
	if err != nil {
		t.Fatalf("unexpected error for valid base+sale update: %v", err)
	}
	if nextBase != 80 {
		t.Fatalf("nextBase = %v, want 80", nextBase)
	}
	if nextSale == nil || *nextSale != 70 {
		t.Fatalf("nextSale = %v, want 70", nextSale)
	}

	invalidBase := 85.0
	_, _, err = resolveUpdatedProductPrices(100, currentSalePtr, models.ProductUpdateRequest{
		BasePrice: &invalidBase,
	})
	if err == nil {
		t.Fatalf("expected error when existing sale exceeds new base")
	}

	negativeSale := -1.0
	_, _, err = resolveUpdatedProductPrices(100, currentSalePtr, models.ProductUpdateRequest{
		SalePrice: &negativeSale,
	})
	if err == nil {
		t.Fatalf("expected error for negative sale")
	}

	keepBase, keepSale, err := resolveUpdatedProductPrices(100, currentSalePtr, models.ProductUpdateRequest{})
	if err != nil {
		t.Fatalf("unexpected error when no updates: %v", err)
	}
	if keepBase != 100 {
		t.Fatalf("keepBase = %v, want 100", keepBase)
	}
	if keepSale == nil || *keepSale != 90 {
		t.Fatalf("keepSale = %v, want 90", keepSale)
	}
}

func TestIsValidProductCategory(t *testing.T) {
	t.Parallel()

	if !isValidProductCategory(models.ProductCategoryFood) {
		t.Fatalf("food category should be valid")
	}
	if isValidProductCategory(models.ProductCategory("invalid")) {
		t.Fatalf("invalid category should not be valid")
	}
}

func TestNormalizeProductEnums(t *testing.T) {
	t.Parallel()

	if got := normalizeProductType(models.ProductType(" PHYSICAL ")); got != models.ProductTypePhysical {
		t.Fatalf("normalized type = %q, want %q", got, models.ProductTypePhysical)
	}
	if got := normalizeProductStatus(models.ProductStatus(" ACTIVE ")); got != models.ProductStatusActive {
		t.Fatalf("normalized status = %q, want %q", got, models.ProductStatusActive)
	}
	if got := normalizeProductCategory(models.ProductCategory(" FOOD ")); got != models.ProductCategoryFood {
		t.Fatalf("normalized category = %q, want %q", got, models.ProductCategoryFood)
	}
}

func TestCalculateProductTotalPages(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		total int64
		limit int
		want  int
	}{
		{name: "empty -> one page", total: 0, limit: 20, want: 1},
		{name: "exact pages", total: 40, limit: 20, want: 2},
		{name: "round up", total: 41, limit: 20, want: 3},
		{name: "invalid limit", total: 100, limit: 0, want: 1},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := calculateProductTotalPages(tc.total, tc.limit); got != tc.want {
				t.Fatalf("total=%d limit=%d => %d, want %d", tc.total, tc.limit, got, tc.want)
			}
		})
	}
}

func TestGenerateProductSlug(t *testing.T) {
	t.Parallel()

	svc := &ProductService{}
	got := svc.generateSlug("  Test Product!  ")
	if !strings.HasPrefix(got, "test-product-") {
		t.Fatalf("slug prefix = %q, want test-product-*", got)
	}
}

func TestGenerateProductSlugFallback(t *testing.T) {
	t.Parallel()

	svc := &ProductService{}
	got := svc.generateSlug("!!!")
	if !strings.HasPrefix(got, "product-") {
		t.Fatalf("fallback slug prefix = %q, want product-*", got)
	}
}
