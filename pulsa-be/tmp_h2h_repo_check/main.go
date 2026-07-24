package main

import (
  "context"
  "database/sql"
  "fmt"
  _ "github.com/lib/pq"
  "pulsa2/internal/repository"
)

func main() {
  db, err := sql.Open("postgres", "postgres://syarif:1nt4l2012@127.0.0.1:5432/pulsa?sslmode=disable")
  if err != nil { panic(err) }
  defer db.Close()
  repo := repository.NewH2HProdukRepository(db)
  rows, err := repo.ListByMember(context.Background(), 3, "DANA", "", "")
  if err != nil { panic(err) }
  for _, row := range rows {
    if row.SKU == "DANA" || row.SKU == "CEKDANA" {
      fmt.Printf("sku=%s tipe=%s harga=%v fee=%v max=%v\n", row.SKU, deref(row.Harga), deref(row.FeeTambahan), deref(row.MaksimalNominal), row.TipeHarga)
    }
  }
}

func deref(v *int64) any {
  if v == nil { return nil }
  return *v
}
