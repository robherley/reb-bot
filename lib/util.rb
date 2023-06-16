# frozen_string_literal: true

module NumUtils
  def abbr
    suffixes = {
      'T' => 1_000_000_000_000,
      'B' => 1_000_000_000,
      'M' => 1_000_000,
      'k' => 1_000
    }

    suffix, div = suffixes.find { |_, factor| self >= factor }

    if suffix
      "#{(to_f / div).round(2)}#{suffix}"
    else
      to_s
    end
  end

  def commas
    to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse
  end
end

class Float
  include NumUtils
end

class Integer
  include NumUtils
end
