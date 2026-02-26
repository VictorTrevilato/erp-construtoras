'use server'

export async function fetchAddressByCep(cep: string) {
    try {
        // Limpa tudo que não for número
        const cleanCep = cep.replace(/\D/g, '')
        
        if (cleanCep.length !== 8) {
            return { success: false, message: "CEP inválido." }
        }

        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await res.json()

        // ViaCEP retorna {"erro": true} se o CEP não existir
        if (data.erro) {
            return { success: false, message: "CEP não encontrado na base dos Correios." }
        }

        // Devolve os dados originais
        return {
            success: true,
            data: {
                logradouro: data.logradouro || "",
                bairro: data.bairro || "",
                cidade: data.localidade || "",
                uf: data.uf || ""
            }
        }
    } catch (error) {
        console.error("Erro na integração ViaCEP:", error)
        return { success: false, message: "Falha na comunicação com o ViaCEP." }
    }
}