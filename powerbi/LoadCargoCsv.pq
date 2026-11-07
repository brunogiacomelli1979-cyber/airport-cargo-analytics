// Create a parameter named CsvFolder with the absolute path of data/processed/csv.
// Create this function as LoadCargoCsv, then seven queries: LoadCargoCsv("flights"), etc.
(name as text) as table =>
let
    Source = Csv.Document(File.Contents(CsvFolder & "/" & name & ".csv"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    Nulls = Table.ReplaceValue(Headers, "", null, Replacer.ReplaceValue, Table.ColumnNames(Headers)),
    Types = List.Transform(Table.ColumnNames(Nulls), (column) =>
        {column, if Text.EndsWith(column, "_datetime") then type datetime
        else if Text.EndsWith(column, "_weight_kg") then type number
        else if Text.EndsWith(column, "_pieces") or column = "legal_deadline_hours" then Int64.Type
        else type text}),
    Typed = Table.TransformColumnTypes(Nulls, Types, "en-US")
in
    Typed
